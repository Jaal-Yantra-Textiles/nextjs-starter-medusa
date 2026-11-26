import { cookies, headers } from "next/headers"

import { CHECKOUT_VARIANT_COOKIE } from "@lib/util/checkout-split"

import { requestHost } from "@lib/util/request-host"

/**
 * Which checkout a request gets: the classic sheet checkout or the
 * single-page one. Rolled out selectively (#2636 follow-up):
 *
 * - `?checkout=single` / `?checkout=classic` on the URL always wins, so any
 *   store can be tried without a deploy.
 * - Then the buyer's sticky random assignment (SINGLE_PAGE_CHECKOUT_PERCENT,
 *   set by the proxy, see checkout-split.ts).
 * - Otherwise SINGLE_PAGE_CHECKOUT_HOSTS (server env) lists the store hosts
 *   that get it by default: comma-separated, `*` for all. Unset = nobody.
 */
export type CheckoutVariant = "single" | "classic"

export async function checkoutVariant(
  searchParams: Record<string, string | string[] | undefined>
): Promise<CheckoutVariant> {
  const q = searchParams.checkout
  const forced = Array.isArray(q) ? q[0] : q
  if (forced === "single" || forced === "classic") return forced

  // Assigned by the proxy's random split (checkout-split.ts), sticky.
  const assigned = (await cookies()).get(CHECKOUT_VARIANT_COOKIE)?.value
  if (assigned === "single" || assigned === "classic") return assigned

  const list = (process.env.SINGLE_PAGE_CHECKOUT_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  if (!list.length) return "classic"
  if (list.includes("*")) return "single"

  const host = requestHost(await headers()).split(":")[0].replace(/^www\./, "")
  return list.includes(host) ? "single" : "classic"
}
