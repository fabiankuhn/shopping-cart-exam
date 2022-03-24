import {
  addCustomerToRegister,
  calculatePaymentTime, calculateScanTime, Checkout, pay,
} from './Shop';
import { CashRegister, CheckoutApi, Customer } from '../models';

const perishableItemsScanSeconds = 2;
const secondsPerBillPayed = 1;

describe('Checkout', () => {
  it('should throw an error, if no cash register is present', () => {
    expect(() => new Checkout([]))
      .toThrowError('No cash register present');
  });

  it('should add customers and calculate flush time', () => {
    const checkoutTestee: CheckoutApi = new Checkout([
      cashRegister(),
      cashRegister(),
    ]);

    checkoutTestee.addCustomer({
      dollarBills: [5, 10, 2],
      shoppingCart: {
        perishableItems: [
          {
            price: 12,
          },
        ],
        normalItems: [],
      },
    });

    checkoutTestee.addCustomer({
      dollarBills: [2],
      shoppingCart: {
        perishableItems: [],
        normalItems: [{
          price: 2,
        }],
      },
    });

    const flushTime = checkoutTestee.calculateFlushTime();

    const amountBillsUsedLongerQueue = 2;
    const amountPerishableItemsLongerQueue = 1;

    expect(flushTime).toBe(
      perishableItemsScanSeconds * amountPerishableItemsLongerQueue
      + secondsPerBillPayed * amountBillsUsedLongerQueue,
    );
  });
});

describe('add customers', () => {
  it('should throw an error, if no cart items were added', () => {
    expect(() => {
      addCustomerToRegister(
        [cashRegister()],
        {
          ...customer(),
          shoppingCart: {
            perishableItems: [],
            normalItems: [],
          },
        },
      );
    }).toThrowError('No cart items were added');
  });

  it('should throw an error, if client does not have sufficient money', () => {
    expect(() => {
      addCustomerToRegister(
        [cashRegister()],
        {
          dollarBills: [10, 2],
          shoppingCart: {
            perishableItems: [{ price: 15 }],
            normalItems: [],
          },
        },
      );
    }).toThrowError('Client does not have sufficient money');
  });

  it('should add a customer to only one queue', () => {
    const registers = addCustomerToRegister(
      [cashRegister(), cashRegister()],
      customer(),
    );

    expect(registers[0].customers).toHaveLength(1);
    expect(registers[1].customers).toHaveLength(0);
  });

  it('should add customers to the queue with the lowest amount of customers', () => {
    const registers = addCustomerToRegister(
      [
        cashRegisterWithTwoCustomers(),
        cashRegister(),
      ],
      customer(),
    );

    expect(registers[0].customers).toHaveLength(2);
    expect(registers[1].customers).toHaveLength(1);
  });
});

describe('calculate scan time', () => {
  it('should sum the scan times according to the cart item type', () => {
    const time = calculateScanTime(
      [
        {
          ...customer(),
          shoppingCart: {
            normalItems: [
              cartItem(),
              cartItem(),
            ],
            perishableItems: [
              cartItem(),
            ],
          },

        },
      ],
      2,
      3,
    );

    expect(time).toBe(4 + 3);
  });
});

describe('calculate payment time', () => {
  it('should not take any time, if customer did not buy any products', () => {
    const result = calculatePaymentTime([
      {
        ...customer(),
        shoppingCart: {
          normalItems: [],
          perishableItems: [],
        },
      },
    ], 1);

    expect(result).toBe(0);
  });

  it('should calculate a second for every bill used', () => {
    const result = calculatePaymentTime([
      {
        dollarBills: [1, 5, 10, 2],
        shoppingCart: {
          normalItems: [
            {
              price: 2,
            },
            {
              price: 4,
            },
          ],
          perishableItems: [{
            price: 10,
          }],
        },
      },
    ], 1);

    expect(result).toBe(3);
  });

  it('should not calculate any additional time, after a customer with exact change', () => {
    /**
     * There is a chain reaction. If one customer pays the exact amount, the next
     * customer receives the product for free. Since that also classifies as
     * exact payment every new payment will be free and without time consumption.
     */
    const result = calculatePaymentTime([
      {
        dollarBills: [5, 2],
        shoppingCart: {
          perishableItems: [{ price: 7 }],
          normalItems: [],
        },
      },
      {
        dollarBills: [5, 10],
        shoppingCart: {
          perishableItems: [],
          normalItems: [{ price: 7 }],
        },
      },
      {
        dollarBills: [2, 1],
        shoppingCart: {
          perishableItems: [],
          normalItems: [{ price: 2 }],
        },
      },
    ], 1);

    expect(result).toBe(2);
  });

  it('should skip clients that do not have enough money', () => {
    const result = calculatePaymentTime([
      {
        dollarBills: [5, 2],
        shoppingCart: {
          perishableItems: [{ price: 10 }],
          normalItems: [],
        },
      },
    ], 1);

    expect(result).toBe(0);
  });
});

describe('pay', () => {
  it.each`
  amount | bills                    | expectedChange | expectedBillsUsed
  ${8}   | ${[8]}                   | ${0}           | ${[8]}
  ${5}   | ${[2, 5]}                | ${0}           | ${[5]}
  ${3}   | ${[1, 2]}                | ${0}           | ${[1, 2]}
  ${4}   | ${[2, 3, 2]}             | ${0}           | ${[2, 2]}
  ${15}  | ${[3, 3, 5, 8]}          | ${1}           | ${[8, 5, 3]}
  ${18}  | ${[3, 3, 3, 3, 3, 5, 8]} | ${1}           | ${[8, 5, 3, 3]}
  ${60}  | ${[50, 20, 20, 20]}      | ${0}           | ${[20, 20, 20]}
    `(
    'should return change $expectedChange and numbers of bills used '
    + '$expectedBillsUsed when amount is $amount and bills are $bills',
    ({
      amount, bills, expectedBillsUsed, expectedChange,
    }: {
      amount: number, bills: number[], expectedChange: number, expectedBillsUsed: number[]
    }) => {
      const { billsUsed, change } = pay(
        bills,
        amount,
      );

      expect(change).toBe(expectedChange);
      expect(billsUsed.sort()).toEqual(expectedBillsUsed.sort());
    },
  );
});

const cartItem = () => ({
  price: 0,
});

const customer = (): Customer => ({
  dollarBills: [],
  shoppingCart: {
    perishableItems: [cartItem()],
    normalItems: [],
  },
});

const cashRegister = (): CashRegister => ({
  customers: [],
});

const cashRegisterWithTwoCustomers = (): CashRegister => ({
  customers: [
    customer(), customer(),
  ],
});
