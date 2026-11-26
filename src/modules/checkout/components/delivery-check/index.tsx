"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { checkDelivery } from "@lib/data/delivery-check"
import {
  type DeliveryCheckResult,
  etaLabel,
  isCheckablePostal,
} from "@lib/util/delivery-check"

/**
 * The checkout's delivery check: runs on its own when the buyer types or
 * changes the shipping PIN / postcode (debounced, no button), shows the
 * answer under the field, and shares it with the payment section so cash on
 * delivery is dropped when the address can't take it.
 */

type Ctx = {
  result: DeliveryCheckResult | null
  setResult: (r: DeliveryCheckResult | null) => void
}

const DeliveryCheckCtx = createContext<Ctx | null>(null)

export function DeliveryCheckProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<DeliveryCheckResult | null>(null)
  return (
    <DeliveryCheckCtx.Provider value={{ result, setResult }}>
      {children}
    </DeliveryCheckCtx.Provider>
  )
}

/** The latest answer for the shipping address, or null (none / no provider). */
export function useDeliveryCheckResult(): DeliveryCheckResult | null {
  return useContext(DeliveryCheckCtx)?.result ?? null
}

const DEBOUNCE_MS = 600

/** Debounced check of (country, postcode). Ignores answers that arrive late. */
export function useDeliveryCheck(
  countryCode: string,
  postalCode: string,
  opts: { cartId?: string; variantId?: string } = {}
) {
  const [result, setResult] = useState<DeliveryCheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    const ticket = ++seq.current
    if (!isCheckablePostal(countryCode, postalCode)) {
      setResult(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      const r = await checkDelivery({
        countryCode,
        postalCode,
        cartId: opts.cartId,
        variantId: opts.variantId,
      })
      if (ticket !== seq.current) return
      setResult(r)
      setLoading(false)
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [countryCode, postalCode, opts.cartId, opts.variantId])

  return { result, loading }
}

/** The answer itself: one line of status, then ETA and cash on delivery. */
export function DeliveryCheckResultView({
  result,
  loading,
  testId = "delivery-check",
}: {
  result: DeliveryCheckResult | null
  loading: boolean
  testId?: string
}) {
  if (loading) {
    return (
      <p className="txt-compact-xsmall text-ui-fg-subtle" aria-live="polite" data-testid={`${testId}-loading`}>
        Checking delivery…
      </p>
    )
  }
  if (!result) return null

  const tone =
    result.serviceable === true
      ? "text-ui-tag-green-text"
      : result.serviceable === false
        ? "text-ui-fg-error"
        : "text-ui-fg-subtle"
  const eta = result.serviceable ? etaLabel(result.eta_days) : null

  return (
    <div aria-live="polite" className="flex flex-col gap-y-0.5" data-testid={testId}>
      <p
        className={`txt-compact-small ${tone}`}
        role={result.serviceable === false ? "alert" : undefined}
        data-testid={`${testId}-message`}
        data-serviceable={String(result.serviceable)}
      >
        {result.message}
      </p>
      {result.serviceable && (eta || result.cod_available !== null) && (
        <p className="txt-compact-xsmall text-ui-fg-subtle" data-testid={`${testId}-details`}>
          {eta && <span>Delivery: {eta}</span>}
          {eta && result.cod_available !== null && <span aria-hidden="true"> · </span>}
          {result.cod_available === true && <span>Cash on delivery available</span>}
          {result.cod_available === false && <span>Cash on delivery not available here</span>}
        </p>
      )}
    </div>
  )
}

/**
 * Drop-in under a shipping postcode field. Publishes its answer to the
 * provider (if any) and clears it on unmount, so switching to pickup (which
 * hides the address) doesn't leave a stale "no COD" behind.
 */
export function DeliveryCheckNotice({
  countryCode,
  postalCode,
  cartId,
}: {
  countryCode: string
  postalCode: string
  cartId?: string
}) {
  const ctx = useContext(DeliveryCheckCtx)
  const { result, loading } = useDeliveryCheck(countryCode, postalCode, { cartId })
  const setShared = ctx?.setResult

  useEffect(() => {
    setShared?.(loading ? null : result)
  }, [result, loading, setShared])
  useEffect(() => () => setShared?.(null), [setShared])

  return <DeliveryCheckResultView result={result} loading={loading} />
}
