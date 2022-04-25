
abstract class CartItem(val price: Int)

class PerishableItem(price: Int) : CartItem(price)

class NormalItem(price: Int) : CartItem(price)

data class Customer(val wallet: Wallet, val cartItems: List<CartItem>) {
    fun cartPrice() = cartItems.sumOf { it.price }
    fun funds() = wallet.dollarNotes.sumOf { it.value }
}

data class Wallet(val dollarNotes: List<DollarNote>) {
    fun notesNeededToPay(cartPrice: Int): List<DollarNote> {

        if (cartPrice > dollarNotes.sumOf { it.value }) {
            throw WorldIsUnjustException("Can not afford it")
        }

        val descendingNotes = dollarNotes.sortedByDescending { it.value }
        val usedNotes = mutableListOf<DollarNote>()

        for (note in descendingNotes) {
            if (note.value <= cartPrice) {
                usedNotes.add(note)
            }
        }

        val restPrice = cartPrice - usedNotes.sumOf { it.value }

        if (restPrice == 0) {
            return usedNotes
        }

        val smallestRemainingNote = dollarNotes
            .filter { usedNotes.contains(it) }
            .minByOrNull { it.value }

        if (
            smallestRemainingNote != null
            && restPrice > 0
            && smallestRemainingNote.value > restPrice
        ) {
            usedNotes.add(smallestRemainingNote)
            return usedNotes
        }

        throw Exception("Calculation failed")
    }
}

class WorldIsUnjustException(message: String) : Exception(message)

data class DollarNote(val value: Int) {
    init {
        require(listOf(1, 2, 5, 10, 20, 50).contains(value)) { "Invalid amount" }
    }
}

class CashRegister(val customers: MutableList<Customer>) {
    fun timeToScan(): Int = customers
        .flatMap { it.cartItems }
        .fold(0) { acc, cartItem ->
            when (cartItem) {
                is NormalItem -> acc + 1
                is PerishableItem -> acc + 2
                else -> throw IllegalArgumentException("Invalid item type")
            }
        }


    fun timeToPay(): Int {
        var time = 0
        var prevCustomerChange: Int? = null

        for (customer in customers) {
            if (prevCustomerChange == 0) {
                break
            }

            val cartPrice = customer.cartPrice()
            val notes = customer.wallet.notesNeededToPay(cartPrice)
            time += notes.size * 1
            prevCustomerChange = cartPrice - notes.sumOf { it.value }
        }

        return time
    }
}

interface CheckoutInterface {
    fun addCustomer(customer: Customer)
    fun calculateFlushTime(): Number
}

class Checkout(val cashRegisters: List<CashRegister>) : CheckoutInterface {

    override fun addCustomer(customer: Customer) {
        val cartPrice = customer.cartPrice()
        val funds = customer.funds()

        require(cashRegisters.isNotEmpty()) { "Cash register must not be empty" }
        require(customer.cartItems.isNotEmpty()) { "Shopping cart must not be empty" }
        require(funds > cartPrice) { "Insufficient money to buy products" }

        val lowestQueueRegister = cashRegisters.minByOrNull { it.customers.size }
        lowestQueueRegister?.customers?.add(customer)
    }

    override fun calculateFlushTime(): Int = cashRegisters.minOf {
        it.timeToScan() + it.timeToPay()
    }
}
