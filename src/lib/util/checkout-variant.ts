import { headers } from "next/headers"

import { requestHost } from "@lib/util/request-host"

/**
 * Which checkout a request gets: the classic sheet checkout or the
 * single-page one. Rolled out selectively (#2636 follow-up):
 *
 * - `?checkout=single` / `?checkout=classic` on the URL always wins, so any
 *   store can be tried without a deploy.
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

  const list = (process.env.SINGLE_PAGE_CHECKOUT_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  if (!list.length) return "classic"
  if (list.includes("*")) return "single"

  const host = requestHost(await headers()).split(":")[0].replace(/^www\./, "")
  return list.includes(host) ? "single" : "classic"
}
