import kotlin.test.Test
import kotlin.test.assertEquals

internal class ShopTest {

    @Test
    fun `should add customer to the lowest register`() {
        val checkout = Checkout(
            cashRegisters = listOf(
                CashRegister(
                    customers = mutableListOf(someCustomer)
                ),
                CashRegister(
                    customers = mutableListOf(someCustomer, someCustomer)
                )
            )
        )

        checkout.addCustomer(someCustomer)

        assertEquals(checkout.cashRegisters[0].customers.size, 1)
        assertEquals(checkout.cashRegisters[0].customers.size, 2)
    }

    private val someCustomer = Customer(
        wallet = Wallet(
            emptyList()
        ),
        cartItems = listOf(
            NormalItem(0)
        )
    )

}
