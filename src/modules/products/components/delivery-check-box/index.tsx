"use client"

import { useEffect, useId, useState } from "react"

import {
  DeliveryCheckResultView,
  useDeliveryCheck,
} from "@modules/checkout/components/delivery-check"

/**
 * "Check delivery" on the product page.
 *
 * ⚠️ OFF by default: the template renders it only when
 * NEXT_PUBLIC_PRODUCT_DELIVERY_CHECK=1. The checkout's automatic check is the
 * primary experience; this box waits on the founder's call.
 *
 * Remembers the last pin/postcode in localStorage (wrapped: private windows
 * and blocked storage just start empty).
 */

const STORAGE_KEY = "jyt_delivery_check"

type Saved = { country: string; postal: string }

const readSaved = (): Saved | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v.postal === "string" && typeof v.country === "string" ? v : null
  } catch {
    return null
  }
}

const save = (v: Saved) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

const label = (iso: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(iso.toUpperCase()) ?? iso
  } catch {
    return iso.toUpperCase()
  }
}

export default function DeliveryCheckBox({
  countryCode,
  countries,
  variantId,
}: {
  /** The storefront's country (from the URL). */
  countryCode: string
  /** ISO-2 codes the buyer may pick from (the region's countries). */
  countries: string[]
  variantId?: string
}) {
  const id = useId()
  const [country, setCountry] = useState(countryCode.toLowerCase())
  const [postal, setPostal] = useState("")
  const { result, loading } = useDeliveryCheck(country, postal, { variantId })
  const india = country === "in"

  useEffect(() => {
    const saved = readSaved()
    if (saved && (saved.country === country || countries.includes(saved.country))) {
      setCountry(saved.country)
      setPostal(saved.postal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (result && !result.invalid) save({ country, postal })
  }, [result, country, postal])

  const options = Array.from(new Set([country, ...countries.map((c) => c.toLowerCase())])).filter(Boolean)

  return (
    <div className="flex flex-col gap-y-2" data-testid="product-delivery-check">
      <label htmlFor={`${id}-postal`} className="txt-compact-small-plus text-ui-fg-base">
        Check delivery
      </label>
      <div className="flex gap-x-2">
        {options.length > 1 && (
          <select
            aria-label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-10 rounded-md border border-ui-border-base bg-ui-bg-field px-2 txt-compact-small text-ui-fg-base"
          >
            {options.map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
        )}
        <input
          id={`${id}-postal`}
          value={postal}
          onChange={(e) => setPostal(e.target.value)}
          inputMode={india ? "numeric" : "text"}
          autoComplete="postal-code"
          maxLength={10}
          placeholder={india ? "Enter PIN code" : "Postal code"}
          className="h-10 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 txt-compact-small text-ui-fg-base outline-none focus:border-ui-border-interactive"
        />
      </div>
      <DeliveryCheckResultView result={result} loading={loading} testId="product-delivery-check-result" />
    </div>
  )
}
