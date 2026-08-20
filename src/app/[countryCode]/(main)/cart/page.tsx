import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getWebsite } from "@lib/data/website"
import CartTemplate from "@modules/cart/templates"
import ThemeEditorBridge from "@modules/layout/components/theme-editor-bridge"
import { Metadata } from "next"

import { notFound } from "next/navigation"


export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ theme_editor?: string }>
}

export default async function Cart(props: Props) {
  const searchParams = await props.searchParams
  const isThemeEditor = searchParams.theme_editor === "true"

  const [cart, customer, website] = await Promise.all([
    retrieveCart().catch((error) => {
      console.error(error)
      return null
    }),
    retrieveCustomer(),
    getWebsite(undefined, { noCache: isThemeEditor }).catch(() => null),
  ])

  if (!cart && !isThemeEditor) return notFound()

  return (
    <>
      <CartTemplate cart={cart} customer={customer} theme={website?.theme} />
      {isThemeEditor && <ThemeEditorBridge />}
    </>
  )
}
