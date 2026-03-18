import { NextRequest, NextResponse } from "next/server"
import { cookies as nextCookies } from "next/headers"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const errorMsg = formData.get("error_Message")?.toString() || "Payment failed"

  console.error("[PayU Failure]", errorMsg)

  const countryCode = (await nextCookies()).get("_medusa_country_code")?.value || "in"
  return NextResponse.redirect(
    new URL(
      `/${countryCode}/checkout?step=payment&error=${encodeURIComponent(errorMsg)}`,
      request.url
    )
  )
}
