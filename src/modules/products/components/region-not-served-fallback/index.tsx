"use client"

import { Button, Input, Label, Text, Textarea, clx } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { useState } from "react"
import { getClientPublishableKey } from "@lib/util/get-client-pubkey"

type Props = {
  product?: HttpTypes.StoreProduct
  countryCode: string
}

// Renders when the storefront has no calculated_price for any of the
// product's variants in the visitor's region — either the country
// isn't covered by any of the partner's regions, or the region exists
// but the variant has no price in its currency (FX fanout hasn't
// happened yet, or partner only ships to a different country in the
// region).
//
// Replaces the price + add-to-cart UI with a friendly contact form
// that POSTs to /store/contact-region-request. The product card body
// (gallery, title, description) is still visible above this block —
// we only swap the commerce piece.
export default function RegionNotServedFallback({
  product,
  countryCode,
}: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  // Env key on single-tenant deploys; the Host-resolved `_medusa_pk` cookie on
  // the shared multi-tenant Worker.
  const publishableKey = getClientPublishableKey()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === "submitting") return
    setStatus("submitting")
    setErrorMessage("")

    try {
      const res = await fetch(
        `${backendUrl}/store/contact-region-request`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-publishable-api-key": publishableKey,
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            message: message.trim() || undefined,
            country_code: countryCode,
            product_handle: product?.handle,
          }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message || `Request failed (${res.status})`)
      }
      setStatus("success")
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err)
      setErrorMessage(m)
      setStatus("error")
    }
  }

  const countryLabel = countryCode ? countryCode.toUpperCase() : "your region"

  if (status === "success") {
    return (
      <div className="border border-ui-border-base rounded-rounded p-6 flex flex-col gap-y-3">
        <Text size="large" weight="plus">
          Thanks — we'll be in touch.
        </Text>
        <Text className="text-ui-fg-subtle">
          We've logged your interest in shipping to {countryLabel}. We'll
          email {email} once this product is available in your region.
        </Text>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="region-not-served-fallback"
      className="border border-ui-border-base rounded-rounded p-6 flex flex-col gap-y-4"
    >
      <div className="flex flex-col gap-y-1">
        <Text size="large" weight="plus">
          We don't ship to {countryLabel} yet
        </Text>
        <Text className="text-ui-fg-subtle" size="small">
          Drop your details and we'll let you know when this product is
          available in your region.
        </Text>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="region-req-name">Name</Label>
        <Input
          id="region-req-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          disabled={status === "submitting"}
        />
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="region-req-email">Email</Label>
        <Input
          id="region-req-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={status === "submitting"}
        />
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="region-req-message">Anything to add? (optional)</Label>
        <Textarea
          id="region-req-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          disabled={status === "submitting"}
        />
      </div>

      {status === "error" && (
        <Text className="text-ui-fg-error" size="small">
          {errorMessage}
        </Text>
      )}

      <Button
        type="submit"
        variant="primary"
        className={clx("w-full h-10")}
        isLoading={status === "submitting"}
        disabled={status === "submitting"}
      >
        Notify me when available
      </Button>
    </form>
  )
}
