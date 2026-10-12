import { isManual } from "@lib/constants"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { isPickupShippingOption } from "@lib/util/fulfillment"
import type { HttpTypes } from "@medusajs/types"
import DiscountCode from "@modules/checkout/components/discount-code"
import CheckoutPaymentSection from "@modules/checkout/components/checkout-payment-section"
import CheckoutTotals from "@modules/checkout/components/checkout-totals"
import QuoteCartNotice from "@modules/cart/components/quote-cart-notice"
import type { QuoteCartTerms } from "types/quote-terms"

const CheckoutSummary = async ({
  cart,
  quoteTerms,
}: {
  cart: HttpTypes.StoreCart
  /** #1787 — null for an ordinary cart. */
  quoteTerms?: QuoteCartTerms | null
}) => {
  const [paymentMethods, shippingOptions] = await Promise.all([
    listCartPaymentMethods(cart.region?.id ?? ""),
    listCartShippingMethods(cart.id),
  ])

  /**
   * Cash (the manual provider) is for a buyer standing at our counter: it is
   * offered only once the cart's delivery is an in-person PICKUP. On a shipped
   * order nobody is there to take the cash, so the region may carry the
   * provider without every shipped cart being offered it.
   */
  const pickupOptionIds = new Set(
    (shippingOptions ?? [])
      .filter((o) => isPickupShippingOption(o as any))
      .map((o) => o.id)
  )
  const isPickup = !!cart.shipping_methods?.some(
    (m) => !!m.shipping_option_id && pickupOptionIds.has(m.shipping_option_id)
  )
  const offeredPaymentMethods = (paymentMethods ?? []).filter(
    (m) => !isManual(m.id) || isPickup
  )

  return (
    <div className="flex flex-col gap-y-8 px-4 py-4 lg:py-10 lg:ps-10 bg-neutral-100 lg:-me-[9999px] lg:pe-[9999px]">
      <CheckoutTotals cart={cart} />

      {/* Directly under the totals: the buyer has just read the full amount,
          and this is the moment the "due today" figure has to appear. */}
      <QuoteCartNotice terms={quoteTerms ?? null} />

      <DiscountCode cart={cart} />

      <CheckoutPaymentSection
        cart={cart}
        availablePaymentMethods={offeredPaymentMethods}
      />
    </div>
  )
}

export default CheckoutSummary