import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getWebsite } from "@lib/data/website"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

export default async function Cart() {
  const [cart, customer, website] = await Promise.all([
    retrieveCart().catch((error) => {
      console.error(error)
      return null
    }),
    retrieveCustomer(),
    getWebsite().catch(() => null),
  ])

  if (!cart) return notFound()

  return <CartTemplate cart={cart} customer={customer} theme={website?.theme} />
}
