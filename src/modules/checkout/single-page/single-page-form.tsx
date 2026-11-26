"use client"

import { useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { saveCheckoutDetails, updateCart } from "@lib/data/cart"
import {
  designOrderRegionLockMessage,
  isDesignOrderCart,
} from "@lib/util/design-order-cart"
import { convertToLocale } from "@lib/util/money"
import type { HttpTypes } from "@medusajs/types"

import { DeliveryCheckNotice } from "@modules/checkout/components/delivery-check"

import { useCheckoutGate } from "./checkout-gate"
import {
  EMPTY_VALUES,
  FIELD_ORDER,
  type CheckoutValues,
  type FieldKey,
  validateCheckout,
} from "./validate"

export type CountryChoice = { iso: string; label: string; region_id: string }

type Props = {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
  countries: CountryChoice[]
  /** The cart's delivery is an in-person pickup (no street address needed). */
  isPickup: boolean
  /** Delivery cards (CheckoutShippingSection). */
  deliverySlot: ReactNode
  /** Payment methods + pay button (CheckoutPaymentSection hideBilling). */
  paymentSlot: ReactNode
}

const draftKey = (cartId: string) => `jyt_checkout_draft_${cartId}`

function initialValues(
  cart: HttpTypes.StoreCart,
  customer: HttpTypes.StoreCustomer | null,
  countries: CountryChoice[]
): CheckoutValues {
  const s = cart.shipping_address
  const b = cart.billing_address
  const meta = (cart.metadata ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  const cartCountry =
    s?.country_code ||
    cart.region?.countries?.[0]?.iso_2 ||
    countries[0]?.iso ||
    ""
  const billingDiffers =
    !!b?.address_1 && !!s?.address_1 && b.address_1 !== s.address_1

  const fromCart: CheckoutValues = {
    ...EMPTY_VALUES,
    email: cart.email || customer?.email || "",
    first_name:
      s?.first_name || str(meta.contact_first_name) || customer?.first_name || "",
    last_name:
      s?.last_name || str(meta.contact_last_name) || customer?.last_name || "",
    phone: s?.phone || str(meta.contact_phone) || customer?.phone || "",
    country_code: cartCountry,
    address_1: s?.address_1 || "",
    city: s?.city || "",
    province: s?.province || "",
    postal_code: s?.postal_code || "",
    billing_same: !billingDiffers,
    billing_address_1: billingDiffers ? b?.address_1 || "" : "",
    billing_city: billingDiffers ? b?.city || "" : "",
    billing_province: billingDiffers ? b?.province || "" : "",
    billing_postal_code: billingDiffers ? b?.postal_code || "" : "",
  }

  // A draft keeps what was typed across a pickup/delivery switch or a
  // country change (the cart itself loses the street on both).
  try {
    const raw = sessionStorage.getItem(draftKey(cart.id))
    if (raw) {
      const draft = JSON.parse(raw) as Partial<CheckoutValues>
      const merged = { ...fromCart }
      for (const k of Object.keys(fromCart) as FieldKey[]) {
        // The cart's region decides the country; a draft must never put the
        // form in a country the cart is not in.
        if (k === "country_code") continue
        const dv = draft[k]
        if (typeof dv === typeof merged[k] && dv !== "" && dv !== undefined) {
          ;(merged as any)[k] = dv
        }
      }
      return merged
    }
  } catch {
    // storage unavailable: the cart values are enough
  }
  return fromCart
}

function payloadOf(v: CheckoutValues, isPickup: boolean, countries: CountryChoice[]) {
  const region_id = countries.find((c) => c.iso === v.country_code)?.region_id
  const base = {
    first_name: v.first_name,
    last_name: v.last_name,
    phone: v.phone,
    country_code: v.country_code,
  }
  const shipping = isPickup
    ? base
    : {
        ...base,
        address_1: v.address_1,
        city: v.city,
        province: v.province,
        postal_code: v.postal_code,
      }
  const billing =
    v.billing_same || isPickup
      ? null
      : {
          ...base,
          address_1: v.billing_address_1,
          city: v.billing_city,
          province: v.billing_province,
          postal_code: v.billing_postal_code,
        }
  return { email: v.email, shipping_address: shipping, billing_address: billing, region_id }
}

export default function SinglePageForm({
  cart,
  customer,
  countries,
  isPickup,
  deliverySlot,
  paymentSlot,
}: Props) {
  const router = useRouter()
  const gate = useCheckoutGate()
  const formId = useId()

  const [values, setValues] = useState<CheckoutValues>(() => ({
    ...EMPTY_VALUES,
    email: cart.email ?? "",
  }))
  const [hydrated, setHydrated] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldKey | "delivery", string>>>({})
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [summary, setSummary] = useState<string[]>([])
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [notice, setNotice] = useState<string | null>(null)
  const [countryNotice, setCountryNotice] = useState<string | null>(null)

  // sessionStorage is client-only: read it after mount.
  useEffect(() => {
    setValues(initialValues(cart, customer, countries))
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.id])

  const valuesRef = useRef(values)
  valuesRef.current = values
  const pickupRef = useRef(isPickup)
  pickupRef.current = isPickup
  const hasShippingMethod = (cart.shipping_methods?.length ?? 0) > 0
  const shipRef = useRef(hasShippingMethod)
  shipRef.current = hasShippingMethod
  const savedPayload = useRef<string>("")
  const saving = useRef<Promise<unknown> | null>(null)

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(draftKey(cart.id), JSON.stringify(values))
    } catch {
      // ignore
    }
  }, [values, hydrated, cart.id])

  const set = (k: FieldKey) => (val: string | boolean) => {
    setValues((v) => ({ ...v, [k]: val }))
    // "Details saved" must not linger over an edit that isn't saved yet.
    setStatus((st) => (st === "saved" ? "idle" : st))
  }

  /** Save if the details are complete and differ from the last save. */
  const save = useCallback(
    async (force = false): Promise<
      { ok: true; total: number; changed: boolean } | { ok: false }
    > => {
      const v = valuesRef.current
      const errs = validateCheckout(v, { isPickup: pickupRef.current })
      if (Object.keys(errs).length) return { ok: false }
      const payload = payloadOf(v, pickupRef.current, countries)
      const key = JSON.stringify(payload)
      if (!force && key === savedPayload.current) {
        return { ok: true, total: cart.total, changed: false }
      }
      if (saving.current) await saving.current
      setStatus("saving")
      const p = saveCheckoutDetails(payload)
      saving.current = p
      const res = await p
      saving.current = null
      if (!res.ok) {
        setStatus("error")
        setNotice(res.error)
        return { ok: false }
      }
      savedPayload.current = key
      setStatus("saved")
      setNotice(null)
      router.refresh()
      return { ok: true, total: res.total, changed: true }
    },
    [countries, cart.total, router]
  )

  // The cart already holds these details on first load: don't re-save them.
  useEffect(() => {
    if (!hydrated) return
    if (!Object.keys(validateCheckout(values, { isPickup })).length) {
      const fromServer = initialValues(cart, customer, countries)
      if (JSON.stringify(fromServer) === JSON.stringify(values)) {
        savedPayload.current = JSON.stringify(payloadOf(values, isPickup, countries))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // Switching pickup <-> delivery changes what must be saved.
  useEffect(() => {
    if (!hydrated) return
    void save()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPickup])

  const onBlur = (k: FieldKey) => () => {
    setTouched((t) => ({ ...t, [k]: true }))
    const errs = validateCheckout(valuesRef.current, { isPickup: pickupRef.current })
    setErrors((e) => {
      const next = { ...e }
      if (errs[k]) next[k] = errs[k]
      else delete next[k]
      return next
    })
    void save()
  }

  const onCountryChange = async (iso: string) => {
    const previous = valuesRef.current.country_code
    setCountryNotice(null)
    const next = { ...valuesRef.current, country_code: iso }
    setValues(next)
    valuesRef.current = next
    const region = countries.find((c) => c.iso === iso)?.region_id
    if (region && region !== cart.region_id && isDesignOrderCart(cart)) {
      // v2 #2646: a region change deletes every line of a design order. Keep
      // the country it was priced for and say why. (The backend refuses with
      // the same words, which the catch below would show if this missed.)
      const back = { ...valuesRef.current, country_code: previous }
      setValues(back)
      valuesRef.current = back
      setCountryNotice(designOrderRegionLockMessage(cart.currency_code))
      return
    }
    if (region && region !== cart.region_id) {
      // Prices, taxes and delivery options all follow the region; change it
      // now (no page reload) and re-save the address right after.
      setStatus("saving")
      try {
        const moved = await updateCart({ region_id: region })
        // Medusa can answer 200 and keep the old region (seen locally when
        // a bag item has no price there): check, don't trust the status.
        if (moved?.region_id !== region) {
          throw new Error("do not have a price")
        }
      } catch (e: any) {
        // Put the country back: the cart is still in the old region.
        const back = { ...valuesRef.current, country_code: previous }
        setValues(back)
        valuesRef.current = back
        setStatus("error")
        const name = countries.find((c) => c.iso === iso)?.label ?? iso.toUpperCase()
        const msg = String(e?.message ?? "")
        setCountryNotice(
          /do not have a price/i.test(msg)
            ? `Some items in your bag can't be sent to ${name}. Choose another country, or remove them.`
            : msg || `Could not change the country to ${name}.`
        )
        return
      }
      savedPayload.current = ""
      router.refresh()
    }
    void save(true)
  }

  // The pay button's check: everything filled in, saved, total unchanged.
  useEffect(() => {
    if (!gate) return
    gate.register(async () => {
      setNotice(null)
      const v = valuesRef.current
      const errs: Partial<Record<FieldKey | "delivery", string>> = validateCheckout(v, {
        isPickup: pickupRef.current,
      })
      if (!shipRef.current) errs.delivery = "Choose a delivery option"
      if (Object.keys(errs).length) {
        setErrors(errs)
        setTouched(Object.fromEntries(FIELD_ORDER.map((k) => [k, true])))
        setSummary(Object.values(errs) as string[])
        const first = [...FIELD_ORDER, "delivery" as const].find((k) => errs[k])
        const el =
          first === "delivery"
            ? document.getElementById(`${formId}-delivery`)
            : document.getElementById(`${formId}-${first}`)
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
        if (el && "focus" in el) (el as HTMLElement).focus({ preventScroll: true })
        return false
      }
      setSummary([])
      const res = await save()
      if (!res.ok) return false
      if (res.changed && res.total !== cart.total) {
        setNotice(
          `Your total is now ${convertToLocale({
            amount: res.total,
            currency_code: cart.currency_code,
          })}. Please check it and press the button again.`
        )
        return false
      }
      return true
    })
    return () => gate.register(null)
  }, [gate, save, cart.total, cart.currency_code, formId])

  const err = (k: FieldKey) => (touched[k] ? errors[k] : undefined)

  const field = (
    k: FieldKey,
    label: string,
    opts: {
      type?: string
      autoComplete?: string
      inputMode?: "numeric" | "tel" | "email" | "text"
      required?: boolean
      hint?: string
      className?: string
    } = {}
  ) => {
    const id = `${formId}-${k}`
    const e = err(k)
    return (
      <div className={opts.className ?? "flex flex-col gap-y-1"}>
        <label htmlFor={id} className="txt-compact-small-plus text-ui-fg-base">
          {label}
          {opts.required !== false && (
            <span className="text-ui-fg-error" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
        <input
          id={id}
          name={k}
          type={opts.type ?? "text"}
          autoComplete={opts.autoComplete}
          inputMode={opts.inputMode}
          required={opts.required !== false}
          aria-invalid={!!e}
          aria-describedby={e ? `${id}-err` : opts.hint ? `${id}-hint` : undefined}
          value={values[k] as string}
          onChange={(ev) => set(k)(ev.target.value)}
          onBlur={onBlur(k)}
          className={
            "h-11 w-full rounded-md border bg-ui-bg-field px-3 txt-compact-medium text-ui-fg-base outline-none transition-colors focus:border-ui-border-interactive focus:shadow-borders-interactive-with-active " +
            (e ? "border-ui-border-error" : "border-ui-border-base")
          }
          data-testid={`sp-${k}`}
        />
        {opts.hint && !e && (
          <span id={`${id}-hint`} className="txt-compact-xsmall text-ui-fg-subtle">
            {opts.hint}
          </span>
        )}
        {e && (
          <span id={`${id}-err`} className="txt-compact-xsmall text-ui-fg-error">
            {e}
          </span>
        )}
      </div>
    )
  }

  const india = values.country_code === "in"

  return (
    <div className="flex flex-col gap-y-8" data-testid="single-page-checkout">
      {summary.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-ui-border-error bg-ui-bg-base p-4"
          data-testid="sp-missing"
        >
          <p className="txt-compact-small-plus text-ui-fg-error">
            Please fix {summary.length === 1 ? "this" : `these ${summary.length} things`} to
            continue:
          </p>
          <ul className="mt-2 list-disc ps-5 txt-compact-small text-ui-fg-base">
            {summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <section aria-labelledby={`${formId}-contact-h`} className="flex flex-col gap-y-4">
        <h2 id={`${formId}-contact-h`} className="h2-docs">
          Contact
        </h2>
        {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email", hint: "For your order confirmation." })}
        <div className="grid grid-cols-1 gap-4 small:grid-cols-2">
          {field("first_name", "First name", { autoComplete: "given-name" })}
          {field("last_name", "Last name", { autoComplete: "family-name" })}
        </div>
        {field("phone", "Phone", {
          type: "tel",
          autoComplete: "tel",
          inputMode: "tel",
          hint: india ? "10-digit mobile number, for delivery updates." : "For delivery updates.",
        })}
      </section>


      {isPickup && (
        <section aria-labelledby={`${formId}-address-h`} className="flex flex-col gap-y-1">
          <h2 id={`${formId}-address-h`} className="h2-docs">
            Shipping address
          </h2>
          <p className="txt-compact-small text-ui-fg-subtle" data-testid="sp-pickup-note">
            Not needed: you&apos;re collecting this order in person. Choose a
            delivery option below to enter an address.
          </p>
        </section>
      )}

      {!isPickup && (
        <section aria-labelledby={`${formId}-address-h`} className="flex flex-col gap-y-4">
          <h2 id={`${formId}-address-h`} className="h2-docs">
            Shipping address
          </h2>
          <div className="flex flex-col gap-y-1">
            <label htmlFor={`${formId}-country_code`} className="txt-compact-small-plus text-ui-fg-base">
              Country / region
              <span className="text-ui-fg-error" aria-hidden="true">
                {" "}
                *
              </span>
            </label>
            <select
              id={`${formId}-country_code`}
              autoComplete="country"
              value={values.country_code}
              onChange={(e) => void onCountryChange(e.target.value)}
              className="h-11 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 txt-compact-medium text-ui-fg-base"
              data-testid="sp-country_code"
            >
              {countries.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.label}
                </option>
              ))}
            </select>
            {countryNotice && (
              <span role="alert" className="txt-compact-xsmall text-ui-fg-error" data-testid="sp-country-notice">
                {countryNotice}
              </span>
            )}
          </div>
          {field("address_1", "Address", { autoComplete: "address-line1" })}
          <div className="grid grid-cols-1 gap-4 small:grid-cols-3">
            {field("city", "City", { autoComplete: "address-level2" })}
            {field("province", "State", { autoComplete: "address-level1", required: false })}
            {field("postal_code", india ? "PIN code" : "Postal code", {
              autoComplete: "postal-code",
              inputMode: india ? "numeric" : "text",
            })}
          </div>
          <DeliveryCheckNotice
            countryCode={values.country_code}
            postalCode={values.postal_code}
            cartId={cart.id}
          />
        </section>
      )}

      <section
        id={`${formId}-delivery`}
        tabIndex={-1}
        aria-labelledby={`${formId}-delivery-h`}
        className="flex flex-col gap-y-2 outline-none"
      >
        <h2 id={`${formId}-delivery-h`} className="sr-only">
          Delivery
        </h2>
        {deliverySlot}
        {errors.delivery && !hasShippingMethod && (
          <span className="txt-compact-xsmall text-ui-fg-error">{errors.delivery}</span>
        )}
      </section>

      {!isPickup && (
        <section aria-labelledby={`${formId}-billing-h`} className="flex flex-col gap-y-4">
          <h2 id={`${formId}-billing-h`} className="sr-only">
            Billing address
          </h2>
          <label className="flex items-center gap-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={values.billing_same}
              onChange={(e) => {
                set("billing_same")(e.target.checked)
                setTimeout(() => void save(), 0)
              }}
              className="h-4 w-4 accent-ui-fg-interactive"
              data-testid="sp-billing_same"
            />
            <span className="txt-compact-small text-ui-fg-base">
              Billing address is the same as shipping
            </span>
          </label>
          {!values.billing_same && (
            <div className="flex flex-col gap-y-4">
              {field("billing_address_1", "Billing address", { autoComplete: "billing address-line1" })}
              <div className="grid grid-cols-1 gap-4 small:grid-cols-3">
                {field("billing_city", "City", { autoComplete: "billing address-level2" })}
                {field("billing_province", "State", { autoComplete: "billing address-level1", required: false })}
                {field("billing_postal_code", india ? "PIN code" : "Postal code", {
                  autoComplete: "billing postal-code",
                  inputMode: india ? "numeric" : "text",
                })}
              </div>
            </div>
          )}
        </section>
      )}

      <section aria-label="Payment" className="flex flex-col gap-y-3">
        <p aria-live="polite" className="txt-compact-xsmall text-ui-fg-subtle min-h-[1rem]" data-testid="sp-status">
          {status === "saving" ? "Saving your details…" : status === "saved" ? "Details saved" : ""}
        </p>
        {notice && (
          <p role="alert" className="txt-compact-small text-ui-fg-error" data-testid="sp-notice">
            {notice}
          </p>
        )}
        {paymentSlot}
      </section>
    </div>
  )
}
