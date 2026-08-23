"use client"

import { Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

/**
 * "What is this page?" — for the buyer who has never seen one (#1389).
 *
 * Almost everyone who opens this link is opening their FIRST one. They arrived
 * from an email, there is no account, no order history and no navigation they
 * recognise, and the page asks them to commit money. The three questions that
 * stop a first-timer are always the same: is this a bill, what happens if I
 * press the button, and what do I owe today.
 *
 * ## Why it is dismissible and remembered
 *
 * 🔑 The same link is opened repeatedly — forwarding it round a procurement
 * team is the use case, not an abuse of it. A guide that reappears every visit
 * becomes furniture the reader learns to skip, which is how the deposit
 * sentence stops being read. Dismissal is kept in `localStorage`, per token, so
 * dismissing one quote's guide does not silently hide the next quote's.
 *
 * 🔴 Rendered CLOSED on the server and opened after mount. Reading
 * `localStorage` during render would hydrate a different tree than the server
 * sent; opening in an effect means a returning buyer sees it flash away at
 * worst, and a first-timer always gets it.
 */

const storageKey = (token: string) => `jyt.quote.guide.dismissed.${token}`

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "This is a price, not a bill",
    body: "Nothing has been charged and nothing is owed. The prices below were prepared for your company and are held until the date shown.",
  },
  {
    title: "Change the quantities if you need to",
    body: "The totals update against the same agreed rates. Freight is charged once for the whole basket, not per item.",
  },
  {
    title: "Accept when you are ready",
    body: "Accepting turns the quote into an order and takes you to checkout. You pay a deposit now and the balance later — both amounts are shown before you pay.",
  },
]

const QuoteHowItWorks = ({
  token,
  depositLine,
}: {
  /** Scopes the dismissal, so one quote's guide is not the next quote's. */
  token: string
  /** The actual split, when we have it. Never a generic "a deposit". */
  depositLine?: string | null
}) => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(storageKey(token))) {
        setOpen(true)
      }
    } catch {
      // Private browsing or a blocked store — show it. A guide shown twice is
      // a smaller failure than a first-timer shown none.
      setOpen(true)
    }
  }, [token])

  const dismiss = () => {
    setOpen(false)
    try {
      window.localStorage.setItem(storageKey(token), "1")
    } catch {
      // Nothing to do; it will simply show again next time.
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 text-left txt-small text-ui-fg-interactive underline underline-offset-2"
      >
        How this quote works
      </button>
    )
  }

  return (
    <div className="mt-6 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-5">
      <div className="flex items-start justify-between gap-x-4">
        <Text className="txt-medium-plus text-ui-fg-base">
          New to this? Here is how it works
        </Text>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss the guide"
          className="txt-small text-ui-fg-subtle hover:text-ui-fg-base"
        >
          Got it
        </button>
      </div>

      <ol className="mt-4 flex flex-col gap-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-x-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ui-bg-base text-[11px] font-medium text-ui-fg-subtle">
              {i + 1}
            </span>
            <div className="min-w-0">
              <Text className="txt-small-plus text-ui-fg-base">{step.title}</Text>
              <Text className="txt-small text-ui-fg-subtle">
                {/* The real numbers replace the generic sentence wherever we
                    have them — "a deposit" is the part people misremember. */}
                {i === STEPS.length - 1 && depositLine ? depositLine : step.body}
              </Text>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default QuoteHowItWorks
