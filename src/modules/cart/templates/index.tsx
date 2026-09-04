import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import FreeShippingBar from "../components/free-shipping-bar"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"
import { WebsiteTheme } from "@lib/data/website"
import QuoteCartNotice from "../components/quote-cart-notice"
import type { QuoteCartTerms } from "types/quote-terms"

const CartTemplate = ({
  cart,
  customer,
  theme,
  quoteTerms,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  theme?: WebsiteTheme | null
  /** #1787 — null for an ordinary cart. */
  quoteTerms?: QuoteCartTerms | null
}) => {
  const cartTheme = theme?.cart
  const showSignIn = cartTheme?.show_sign_in_prompt !== false
  const showOrderSummary = cartTheme?.show_order_summary !== false
  const showFreeShippingBar = cartTheme?.show_free_shipping_bar ?? false
  const freeShippingThreshold = cartTheme?.free_shipping_threshold

  return (
    <div className="py-12" data-theme-section="cart">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-40">
            <div className="flex flex-col bg-white py-6 gap-y-6">
              {/* Above everything else on purpose: "these prices are held, and
                  this is what you pay today" is context for the whole basket,
                  and a buyer who reaches the total without it has already
                  formed an expectation. Not theme-gated — a payment term is
                  not decoration a shop may switch off. */}
              <QuoteCartNotice terms={quoteTerms ?? null} />
              {showFreeShippingBar && freeShippingThreshold && (
                <FreeShippingBar
                  cart={cart}
                  threshold={freeShippingThreshold}
                />
              )}
              {!customer && showSignIn && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {showOrderSummary && cart && cart.region && (
                  <div className="bg-white py-6">
                    <Summary cart={cart as any} checkoutButtonText={cartTheme?.checkout_button_text} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage theme={theme} />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
