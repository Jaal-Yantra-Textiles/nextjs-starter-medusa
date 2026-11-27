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
  /**
   * Only when the check was asked with a cart: may THIS cart pay cash to the
   * courier at this address? The same rule the backend enforces when the order
   * is placed (Delhivery COD for the PIN, India + INR, no design order or
   * deposit, under the cap). null = couldn't tell.
   */
  courier_cod?: {
    allowed: boolean
    reason: string
    /** ₹ COD fee added to the delivery charge when paying cash (taxed like delivery). */
    fee?: number
  } | null
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
 * Which payment methods to offer, cash included or not.
 *
 * - PICKUP: cash stays (the buyer pays at our counter), as before.
 * - COURIER: cash only on a definite yes from the delivery check for this cart
 *   (`courier_cod.allowed`). No answer, an unknown, or a no all hide it — the
 *   backend refuses a courier cash order it hasn't approved, so offering it
 *   on a maybe would only end in an error at "Place order".
 */
export const offeredPaymentMethods = <T extends { id: string }>(
  methods: T[],
  opts: {
    isPickup: boolean
    check: Pick<DeliveryCheckResult, "courier_cod"> | null | undefined
  }
): T[] => {
  if (opts.isPickup) return methods
  return opts.check?.courier_cod?.allowed === true
    ? methods
    : methods.filter((m) => !isManual(m.id))
}

/** Can this address pay cash on delivery? Prefers the cart-aware answer. */
export const codAnswer = (
  check: Pick<DeliveryCheckResult, "cod_available" | "courier_cod"> | null | undefined
): boolean | null => {
  if (!check) return null
  if (check.courier_cod) return check.courier_cod.allowed
  return check.cod_available
}

export const etaLabel = (eta: DeliveryCheckResult["eta_days"]): string | null => {
  if (!eta) return null
  return eta.min === eta.max
    ? `About ${eta.min} day${eta.min === 1 ? "" : "s"}`
    : `${eta.min}–${eta.max} days`
}
