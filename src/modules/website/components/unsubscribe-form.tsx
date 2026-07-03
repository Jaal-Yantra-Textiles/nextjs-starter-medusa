"use client"

import { useState } from "react"
import { Button, Text } from "@medusajs/ui"
import { unsubscribeSubscriber } from "@lib/data/website"

type Props = {
  id?: string
  email?: string
  maskedEmail: string | null
}

/**
 * Confirmation-gated unsubscribe. We deliberately don't opt people out on page
 * load (email-scanner prefetch would unsubscribe everyone) — the user clicks
 * "Unsubscribe" and we POST the opt-out.
 */
export default function UnsubscribeForm({ id, email, maskedEmail }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [message, setMessage] = useState<string>("")

  const onConfirm = async () => {
    setState("loading")
    try {
      const res = await unsubscribeSubscriber({ id, email })
      setMessage(res.message)
      setState("done")
    } catch (e) {
      setMessage("Something went wrong. Please try again in a moment.")
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ui-tag-green-bg text-ui-tag-green-text">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <Text size="large" weight="plus">
          {message}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Changed your mind? You can re-subscribe any time from our website.
        </Text>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Text className="text-ui-fg-subtle">
        {maskedEmail ? (
          <>
            You&rsquo;re about to unsubscribe{" "}
            <span className="font-medium text-ui-fg-base">{maskedEmail}</span> from our
            newsletter and blog updates.
          </>
        ) : (
          <>Confirm below to stop receiving our newsletter and blog updates.</>
        )}
      </Text>

      <Button
        variant="primary"
        size="large"
        onClick={onConfirm}
        isLoading={state === "loading"}
        disabled={state === "loading"}
      >
        Unsubscribe
      </Button>

      {state === "error" && (
        <Text size="small" className="text-ui-fg-error">
          {message}
        </Text>
      )}
    </div>
  )
}
