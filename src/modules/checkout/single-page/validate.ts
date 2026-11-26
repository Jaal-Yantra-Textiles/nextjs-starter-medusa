/**
 * What the single-page checkout needs before it may save or pay.
 * Pure: unit-testable and shared by the form and the pay-button gate.
 */

export type CheckoutValues = {
  email: string
  first_name: string
  last_name: string
  phone: string
  country_code: string
  address_1: string
  city: string
  province: string
  postal_code: string
  billing_same: boolean
  billing_address_1: string
  billing_city: string
  billing_province: string
  billing_postal_code: string
}

export type FieldKey = keyof CheckoutValues

export const EMPTY_VALUES: CheckoutValues = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  country_code: "",
  address_1: "",
  city: "",
  province: "",
  postal_code: "",
  billing_same: true,
  billing_address_1: "",
  billing_city: "",
  billing_province: "",
  billing_postal_code: "",
}

/** Top-to-bottom order on the page: the first error found is focused. */
export const FIELD_ORDER: FieldKey[] = [
  "email",
  "first_name",
  "last_name",
  "phone",
  "country_code",
  "address_1",
  "city",
  "postal_code",
  "billing_address_1",
  "billing_city",
  "billing_postal_code",
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Indian mobile: 10 digits starting 6-9, with an optional +91 / 0 prefix. */
export function normaliseIndianMobile(raw: string): string | null {
  let d = raw.replace(/\D/g, "")
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2)
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1)
  return /^[6-9]\d{9}$/.test(d) ? d : null
}

function postalError(country: string, value: string): string | undefined {
  const v = value.trim()
  if (!v) return "Enter a postal code"
  if (country === "in" && !/^\d{6}$/.test(v)) return "PIN code must be 6 digits"
  if (country === "us" && !/^\d{5}(-\d{4})?$/.test(v)) return "Enter a 5-digit ZIP code"
  return undefined
}

export function validateCheckout(
  v: CheckoutValues,
  { isPickup }: { isPickup: boolean }
): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!EMAIL.test(v.email.trim())) e.email = "Enter a valid email address"
  if (!v.first_name.trim()) e.first_name = "Enter your first name"
  if (!v.last_name.trim()) e.last_name = "Enter your last name"

  const digits = v.phone.replace(/\D/g, "")
  if (!digits) e.phone = "Enter a phone number"
  else if (v.country_code === "in" && !normaliseIndianMobile(v.phone))
    e.phone = "Enter a 10-digit mobile number"
  else if (digits.length < 7 || digits.length > 15) e.phone = "Enter a valid phone number"

  if (!v.country_code) e.country_code = "Choose a country"

  if (!isPickup) {
    if (!v.address_1.trim()) e.address_1 = "Enter your street address"
    if (!v.city.trim()) e.city = "Enter a city"
    const pe = postalError(v.country_code, v.postal_code)
    if (pe) e.postal_code = pe

    if (!v.billing_same) {
      if (!v.billing_address_1.trim()) e.billing_address_1 = "Enter the billing address"
      if (!v.billing_city.trim()) e.billing_city = "Enter the billing city"
      const be = postalError(v.country_code, v.billing_postal_code)
      if (be) e.billing_postal_code = be
    }
  }
  return e
}
