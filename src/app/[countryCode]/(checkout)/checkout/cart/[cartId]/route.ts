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
    const cart = await retrieveCart(
      cartId,
      "id,shipping_address.country_code,region.countries.iso_2"
    )

    const regionCountries = ((cart as any)?.region?.countries ?? [])
      .map((c: { iso_2?: string | null }) =>
        String(c?.iso_2 ?? "").trim().toLowerCase()
      )
      .filter(Boolean)

    const cartCountry = String(
      (cart as any)?.shipping_address?.country_code ?? ""
    )
      .trim()
      .toLowerCase()

    const urlCountry = String(countryCode ?? "").trim().toLowerCase()

    /**
     * 🔴 This used to read `region.countries[0]` — the region's FIRST country,
     * in whatever order the API returned it — and override the URL with it. A
     * Swedish buyer on a correct `/se/` link was sent to `/al/` (Albania).
     * Seeding Albania into a local region and still getting Austria is the
     * tell: the country is not "alphabetically first", it is ARBITRARY.
     */
    if (cartCountry && regionCountries.includes(cartCountry)) {
      checkoutCountry = cartCountry
    } else if (urlCountry && regionCountries.includes(urlCountry)) {
      // The link named a country this region serves. It is the only real
      // signal about the buyer, and overriding it is what broke /se/.
      checkoutCountry = urlCountry
    } else if (regionCountries.length === 1) {
      checkoutCountry = regionCountries[0]
    } else if (regionCountries.length > 1) {
      // ⚠️ LAST RESORT and a genuine guess — nothing here knows where the
      // buyer is. The real fix is the country being set when the cart is made.
      checkoutCountry = regionCountries[0]
    }
  } catch {
    // keep countryCode
  }

  return NextResponse.redirect(
    new URL(`/${checkoutCountry}/checkout?step=address`, request.url)
  )
}
