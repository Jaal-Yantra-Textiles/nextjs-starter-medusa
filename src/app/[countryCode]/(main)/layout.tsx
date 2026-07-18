import { Metadata } from "next"
import { headers } from "next/headers"

import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getRequestBaseURL } from "@lib/util/base-url"
import { getWebsite } from "@lib/data/website"
import { StoreCartShippingOption } from "@medusajs/types"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import ThemeStyles from "@modules/layout/components/theme-styles"
import { ThemeProvider } from "@lib/context/theme-context"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"


export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await getRequestBaseURL()),
  }
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  const hdrs = await headers()
  const isIframe = hdrs.get("sec-fetch-dest") === "iframe"

  const [customer, cart, website] = await Promise.all([
    retrieveCustomer(),
    retrieveCart(),
    getWebsite(undefined, { noCache: isIframe }).catch(() => null),
  ])
  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    const { shipping_options } = await listCartOptions()

    shippingOptions = shipping_options
  }

  const theme = website?.theme || {}

  return (
    <>
      <ThemeStyles theme={theme} />
      <ThemeProvider theme={theme}>
        <Nav theme={theme} />
        {customer && cart && (
          <CartMismatchBanner customer={customer} cart={cart} />
        )}

        {cart && (
          <FreeShippingPriceNudge
            variant="popup"
            cart={cart}
            shippingOptions={shippingOptions}
          />
        )}
        {props.children}
        <Footer theme={theme} />
      </ThemeProvider>
    </>
  )
}
