import { isManual } from "@lib/constants"

/** What `GET /store/delivery-check` answers. */
export type DeliveryCheckResult = {
  /** null = couldn't tell (carrier down, bad postcode). Never block on null. */
  serviceable: boolean | null
  cod_available: boolean | null
  eta_days: { min: number; max: number } | null
  message: string
  source: string[]
  country_code: string
  postal_code: string
  invalid?: boolean
}

/**
 * Worth asking the backend yet? India: exactly 6 digits (first not 0).
 * Elsewhere: at least 3 characters. Keeps the box from firing on every
 * keystroke of a half-typed pin.
 */
export const isCheckablePostal = (countryCode: string, postalCode: string): boolean => {
  const country = (countryCode || "").toLowerCase()
  const raw = (postalCode || "").trim()
  if (!country) return false
  if (country === "in") return /^[1-9][0-9]{5}$/.test(raw.replace(/[\s-]/g, ""))
  return raw.replace(/[\s-]/g, "").length >= 3
}

/**
 * Drop cash on delivery when the delivery check says this address can't take
 * it. Only a definite `false` removes it: an unknown answer (null) or no
 * check at all leaves the list alone.
 */
export const filterCodForDelivery = <T extends { id: string }>(
  methods: T[],
  check: Pick<DeliveryCheckResult, "cod_available"> | null | undefined
): T[] =>
  check?.cod_available === false ? methods.filter((m) => !isManual(m.id)) : methods

export const etaLabel = (eta: DeliveryCheckResult["eta_days"]): string | null => {
  if (!eta) return null
  return eta.min === eta.max
    ? `About ${eta.min} day${eta.min === 1 ? "" : "s"}`
    : `${eta.min}–${eta.max} days`
}
