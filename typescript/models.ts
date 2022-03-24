export interface CheckoutApi {
  addCustomer(customer: Customer): void
  calculateFlushTime(): number
}

export type DollarBill = 1 | 2 | 5 | 10 | 20

export type CartItem = {
  price: number
}

export type ShoppingCart = {
  normalItems: CartItem[]
  perishableItems: CartItem[]
}

export type Customer = {
  dollarBills: DollarBill[]
  shoppingCart: ShoppingCart
}

export type CashRegister = {
  customers: Customer[]
}
