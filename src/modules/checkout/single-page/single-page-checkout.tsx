import { isManual } from "@lib/constants"
import { retrieveCustomerAddresses } from "@lib/data/customer"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { listRegions } from "@lib/data/regions"
import { isPickupShippingOption } from "@lib/util/fulfillment"
import type { HttpTypes } from "@medusajs/types"
import QuoteCartNotice from "@modules/cart/components/quote-cart-notice"
import CheckoutItemList from "@modules/checkout/components/checkout-item-list"
import CheckoutPaymentSection from "@modules/checkout/components/checkout-payment-section"
import CheckoutShippingSection from "@modules/checkout/components/checkout-shipping-section"
import CheckoutTotals from "@modules/checkout/components/checkout-totals"
import { DeliveryCheckProvider } from "@modules/checkout/components/delivery-check"
import DiscountCode from "@modules/checkout/components/discount-code"
import SignInPrompt from "@modules/checkout/components/sign-in-prompt"
import type { QuoteCartTerms } from "types/quote-terms"

import { CheckoutGateProvider } from "./checkout-gate"
import SinglePageForm, { type CountryChoice } from "./single-page-form"

const countryLabel = (iso: string, fallback: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(iso.toUpperCase()) ?? fallback
  } catch {
    return fallback
  }
}

/**
 * Single-page checkout: everything on one page, nothing behind a modal.
 * Left: contact, delivery, address, billing, payment, one button.
 * Right: what you're buying, discount code, totals.
 */
export default async function SinglePageCheckout({
  cart,
  customer,
  countryCode,
  quoteTerms,
}: {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
  countryCode: string
  quoteTerms?: QuoteCartTerms | null
}) {
  const [shippingOptions, regions, paymentMethods] = await Promise.all([
    listCartShippingMethods(cart.id),
    listRegions(),
    listCartPaymentMethods(cart.region?.id ?? ""),
    retrieveCustomerAddresses(),
  ])

  const countries: CountryChoice[] = (regions ?? [])
    .flatMap((r) =>
      (r.countries ?? []).map((c) => ({
        iso: c.iso_2 ?? "",
        label: countryLabel(c.iso_2 ?? "", c.display_name ?? c.iso_2 ?? ""),
        region_id: r.id,
      }))
    )
    .filter((c) => c.iso)
    .sort((a, b) => a.label.localeCompare(b.label))

  // Cash on delivery is for pickup only (same rule as the classic checkout).
  const pickupIds = new Set(
    (shippingOptions ?? []).filter((o) => isPickupShippingOption(o as any)).map((o) => o.id)
  )
  const isPickup = !!cart.shipping_methods?.some(
    (m) => !!m.shipping_option_id && pickupIds.has(m.shipping_option_id)
  )
  const offered = (paymentMethods ?? []).filter((m) => !isManual(m.id) || isPickup)

  const resolvedCountry =
    cart.shipping_address?.country_code || countryCode || cart.region?.countries?.[0]?.iso_2 || ""

  return (
    <CheckoutGateProvider>
      <DeliveryCheckProvider>
      <div className="overflow-x-hidden">
        <div className="lg:content-container flex flex-col-reverse lg:grid lg:grid-cols-[7fr_5fr] min-h-screen">
          <div className="flex flex-col gap-y-6 px-4 py-6 lg:pe-10 lg:py-10 lg:ps-0">
            {!customer && <SignInPrompt />}
            <SinglePageForm
              cart={cart}
              customer={customer}
              countries={countries}
              isPickup={isPickup}
              deliverySlot={
                <CheckoutShippingSection
                  key="delivery"
                  cart={cart}
                  availableShippingOptions={shippingOptions}
                  regions={regions ?? []}
                  currentCountry={resolvedCountry}
                  hideCountryPicker
                  layout="rows"
                />
              }
              paymentSlot={
                <CheckoutPaymentSection key="payment" cart={cart} availablePaymentMethods={offered} hideBilling />
              }
            />
          </div>

          <aside
            aria-label="Order summary"
            className="flex flex-col gap-y-6 px-4 py-6 lg:py-10 lg:ps-10 bg-neutral-100 lg:-me-[9999px] lg:pe-[9999px]"
          >
            <h2 className="sr-only">Order summary</h2>
            <CheckoutItemList cart={cart} />
            <DiscountCode cart={cart as any} alwaysOpen />
            <CheckoutTotals cart={cart} />
            <QuoteCartNotice terms={quoteTerms ?? null} />
          </aside>
        </div>
      </div>
      </DeliveryCheckProvider>
    </CheckoutGateProvider>
  )
}
