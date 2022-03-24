import {
  CartItem, CashRegister, CheckoutApi, Customer, DollarBill,
} from '../models';

export class Checkout implements CheckoutApi {
  readonly normalItemsSeconds = 1;
  readonly perishableItemsSeconds = 2;
  readonly secondsPerBillPayed = 1;

  constructor(private cashRegisters: CashRegister[]) {
    if (!cashRegisters || cashRegisters.length < 1) {
      throw new Error('No cash register present');
    }
  }

  addCustomer(customer: Customer) {
    this.cashRegisters = addCustomerToRegister(this.cashRegisters, customer);
  }

  calculateFlushTime() {
    const cashRegisterTimes = this.cashRegisters.map((cashRegister) => {
      const scanTime = calculateScanTime(
        cashRegister.customers,
        this.normalItemsSeconds,
        this.perishableItemsSeconds,
      );
      const paymentTime = calculatePaymentTime(cashRegister.customers, this.secondsPerBillPayed);
      return scanTime + paymentTime;
    });
    return Math.max(...cashRegisterTimes);
  }
}

export const addCustomerToRegister = (cashRegisters: CashRegister[], newCustomer: Customer) => {
  const { normalItems, perishableItems } = newCustomer.shoppingCart;

  if (normalItems.length < 1 && perishableItems.length < 1) {
    throw new Error('No cart items were added');
  }

  const price = itemsSum([...normalItems, ...perishableItems]);

  if (insufficientMoney(newCustomer.dollarBills, price)) {
    throw new Error('Client does not have sufficient money');
  }

  const registerWithSmallestQueue = cashRegisterWithSmallestQueue(cashRegisters);

  return cashRegisters.map(
    (register) => (register === registerWithSmallestQueue
      ? ({ ...register, customers: [...register.customers, newCustomer] })
      : register),
  );
};

export const calculateScanTime = (
  customers: Customer[],
  normalItemSeconds: number,
  perishableItemSeconds: number,
): number => {
  const amountNormalItems = customers
    .flatMap((customer) => customer.shoppingCart.normalItems)
    .length;

  const amountPerishableItems = customers
    .flatMap((customer) => customer.shoppingCart.perishableItems)
    .length;

  const timeNormalItems = amountNormalItems * normalItemSeconds;
  const timePerishableItems = amountPerishableItems * perishableItemSeconds;

  return timeNormalItems + timePerishableItems;
};

export const calculatePaymentTime = (customers: Customer[], secondsPerBillPayed: number): number => {
  const { time } = customers.reduce((prev, customer) => {
    const { perishableItems, normalItems } = customer.shoppingCart;
    const { dollarBills } = customer;
    const price = itemsSum([...perishableItems, ...normalItems]);

    if (insufficientMoney(dollarBills, price)) {
      return {
        time: 0,
        change: 0,
      };
    }

    const { billsUsed, change } = pay(dollarBills, price);

    if (prev.change === 0) {
      return {
        time: prev.time,
        change: 0,
      };
    }

    return {
      time: prev.time + (billsUsed.length * secondsPerBillPayed),
      change,
    };
  }, {
    time: 0,
    change: undefined,
  });

  return time;
};

export const pay = (bills: number[], total: number): {billsUsed: number[], change: number} => {
  if (total === 0) {
    return {
      billsUsed: [],
      change: 0,
    };
  }

  const smallestBill = Math.min(...bills);

  if (smallestBill > total) {
    return {
      billsUsed: [smallestBill],
      change: smallestBill - total,
    };
  }

  let usedBills = null;
  let changeNeeded = Infinity;

  bills.forEach((bill) => {
    if (bill <= total) {
      const index = bills.findIndex((p) => p === bill);
      const leftoverBills = [...bills];
      leftoverBills.splice(index, 1);

      const { billsUsed, change } = pay(leftoverBills, total - bill);

      if (usedBills === null || billsUsed.length + 1 < usedBills.length || change < changeNeeded) {
        usedBills = [...billsUsed, bill];
        changeNeeded = change;
      }
    }
  });

  return {
    billsUsed: usedBills,
    change: changeNeeded,
  };
};

export const insufficientMoney = (dollarBills: DollarBill[], total: number) => dollarBills
  .reduce((prev, curr) => prev + curr, 0) < total;

export const itemsSum = (items: CartItem[]) => items
  .reduce((prev, curr) => prev + curr.price, 0);

export const cashRegisterWithSmallestQueue = (cashRegisters: CashRegister[]) => cashRegisters
  .reduce((prev, curr) => (prev.customers.length > curr.customers.length ? curr : prev));
