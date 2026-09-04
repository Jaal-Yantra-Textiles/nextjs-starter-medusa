import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { retrieveCart } from "@lib/data/cart"

/**
 * Adopt a cart named in the URL and hand the buyer to checkout (#1787).
 *
 * ## Why this exists here
 *
 * The abandoned-cart recovery mail links to `/checkout/cart/<cart_id>`, and
 * this route is what makes such a link mean anything: a buyer clicking it from
 * an email has no cart cookie, so without adopting the id from the URL the
 * checkout would open empty.
 *
 * 🔴 It existed only in `apps/storefront`, so the link **404'd on every
 * partner storefront served by this app** — confirmed against a live buyer's
 * cart on `saransh.cicilabel.com` while the identical URL worked on
 * `cicilabel.com`. Same class of gap as the deposit's third door: a feature
 * verified on one of two forks and assumed to be everywhere.
 *
 * ## Two things it must get right
 *
 * The redirect goes to the CART's country, not the URL's. The recovery flow
 * builds its link with no country segment at all (`STORE_URL +
 * "/checkout/cart/" + cart.id`), so the middleware fills in
 * `NEXT_PUBLIC_DEFAULT_REGION` — handing an AUD cart to a checkout in the
 * default region, where payment providers resolve from the wrong country and
 * the address form's region-scoped country select offers no option matching
 * the buyer's address, blocking submit with nothing in any log.
 *
 * ⚠️ The cart id is taken on trust, exactly as in `apps/storefront`. Anyone
 * holding an id can adopt that cart. Tracked separately on #1787; not widened
 * here, because a recovery link that works on one storefront and 404s on the
 * other is the defect in front of us.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ countryCode: string; cartId: string }> }
) {
  const { countryCode, cartId } = await params

  const cookieStore = await cookies()
  cookieStore.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  // Best-effort: a failed lookup keeps the URL's country rather than stranding
  // a buyer who just clicked a recovery mail.
  let checkoutCountry = countryCode

  try {
    const cart = await retrieveCart(cartId, "id,region.countries.iso_2")
    const cartCountry = (cart as any)?.region?.countries?.[0]?.iso_2?.toLowerCase()

    if (cartCountry && cartCountry !== countryCode) {
      checkoutCountry = cartCountry
    }
  } catch {
    // keep countryCode
  }

  return NextResponse.redirect(
    new URL(`/${checkoutCountry}/checkout?step=address`, request.url)
  )
}
