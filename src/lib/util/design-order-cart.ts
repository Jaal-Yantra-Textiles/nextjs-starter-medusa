/**
 * A design order's cart is locked to the currency it was priced in (v2 #2646).
 *
 * The admin builds a design order by hand: custom-priced lines in one currency,
 * stamped `metadata.source = "design-order"`. Medusa deletes every
 * custom-priced line when a cart changes region, so moving this cart to
 * another country's region empties it. On 2026-11-26 a buyer picked another
 * country at checkout and an INR order became an empty AED cart.
 *
 * The backend refuses the change too (400, same words). This copy exists so the
 * storefront can say so before it asks, and keep the buyer where they are.
 */
export const isDesignOrderCart = (
  cart?: { metadata?: Record<string, unknown> | null } | null
) => cart?.metadata?.source === "design-order"

export const designOrderRegionLockMessage = (currencyCode?: string | null) => {
  const currency = String(currencyCode ?? "").trim().toUpperCase()
  return (
    `This order is priced in ${currency || "its original currency"}. ` +
    `To pay in another currency, ask us for a new design order.`
  )
}
