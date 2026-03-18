import { NextRequest, NextResponse } from "next/server"
import { sdk } from "@lib/config"
import { cookies as nextCookies } from "next/headers"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const cartId = request.nextUrl.searchParams.get("cart_id")

  const status = formData.get("status")?.toString() || ""
  const txnid = formData.get("txnid")?.toString() || ""
  const mihpayid = formData.get("mihpayid")?.toString() || ""
  const hash = formData.get("hash")?.toString() || ""

  if (status !== "success" || !cartId) {
    // Redirect to checkout with error
    const countryCode = (await nextCookies()).get("_medusa_country_code")?.value || "in"
    return NextResponse.redirect(
      new URL(`/${countryCode}/checkout?step=payment&error=payment_failed`, request.url)
    )
  }

  try {
    // Complete the cart — Medusa will call authorizePayment on the PayU provider
    // Pass the PayU response data so the provider can verify
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value
    const headers: Record<string, string> = {}
    if (token) headers.authorization = `Bearer ${token}`

    await sdk.store.cart.complete(cartId, {}, headers)

    // Clear cart cookie
    cookies.set("_medusa_cart_id", "", { maxAge: -1 })

    // Redirect to order confirmation
    const countryCode = cookies.get("_medusa_country_code")?.value || "in"
    return NextResponse.redirect(
      new URL(`/${countryCode}/order/confirmed`, request.url)
    )
  } catch (error: any) {
    console.error("[PayU Success] Error completing cart:", error)
    const countryCode = (await nextCookies()).get("_medusa_country_code")?.value || "in"
    return NextResponse.redirect(
      new URL(`/${countryCode}/checkout?step=payment&error=order_failed`, request.url)
    )
  }
}
