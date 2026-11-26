"use client"

import { createContext, useContext, useRef, type ReactNode } from "react"

/**
 * The single-page checkout's "is everything filled in and saved?" check.
 *
 * The form registers it; the pay button runs it before opening PayU, Stripe
 * or placing a cash order. Returning false means "stop": the form has already
 * shown the buyer what is missing. Outside the single-page checkout there is
 * no gate and the old button behaviour is unchanged.
 */
type Gate = () => Promise<boolean>

type GateContext = {
  register: (gate: Gate | null) => void
  run: (() => Promise<boolean>) | null
}

const Ctx = createContext<GateContext | null>(null)

export function CheckoutGateProvider({ children }: { children: ReactNode }) {
  const gate = useRef<Gate | null>(null)
  const value: GateContext = {
    register: (g) => {
      gate.current = g
    },
    run: async () => (gate.current ? gate.current() : true),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** `null` outside the single-page checkout. */
export function useCheckoutGate() {
  return useContext(Ctx)
}
