/**
 * Random split between the classic and single-page checkout (#2636
 * follow-up). Pure: the proxy calls it, the page reads the cookie it sets.
 *
 * - `?checkout=single|classic` always wins and is remembered.
 * - A buyer who already has a variant keeps it (30-day cookie), so the same
 *   person never flips between checkouts mid-purchase.
 * - Otherwise SINGLE_PAGE_CHECKOUT_PERCENT (0-100) of new buyers get the
 *   single page. Unset or 0 = nobody is assigned (classic, unless the
 *   store host is listed in SINGLE_PAGE_CHECKOUT_HOSTS).
 */
export const CHECKOUT_VARIANT_COOKIE = "_checkout_v"
export type Variant = "single" | "classic"

export function isCheckoutPath(pathname: string): boolean {
  // /in/checkout, not /in/checkout/cart/:id or /in/checkout/payment-failed
  return /^\/[a-z]{2}\/checkout\/?$/.test(pathname)
}

export function pickVariant(opts: {
  query: string | null
  cookie: string | undefined
  percent: number
  random?: () => number
}): { variant: Variant | null; remember: boolean } {
  const { query, cookie, percent } = opts
  if (query === "single" || query === "classic") return { variant: query, remember: true }
  if (cookie === "single" || cookie === "classic") return { variant: cookie, remember: false }
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))
  if (p <= 0) return { variant: null, remember: false }
  const r = (opts.random ?? Math.random)() * 100
  return { variant: r < p ? "single" : "classic", remember: true }
}
