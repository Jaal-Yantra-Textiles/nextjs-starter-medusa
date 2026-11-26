"use client"

import { Button, Heading, Text, Textarea } from "@medusajs/ui"
import { useEffect, useRef, useState, useTransition } from "react"

import { submitFeedback, type FeedbackRating, type FeedbackView } from "@lib/data/feedback"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Post-delivery feedback: stars (required), an optional note, and — when the
 * backend offers some — an optional "which of these feels like you?" artwork
 * pick. States: the form, thank-you after sending, already answered.
 */
const LABELS = ["Not happy", "Could be better", "It's okay", "Good", "Love it"]
const RATING_NUMBER: Record<FeedbackRating, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="content-container flex min-h-[60vh] items-center justify-center py-16">
    <div className="w-full max-w-lg rounded-xl border border-ui-border-base bg-ui-bg-base p-6 shadow-elevation-card-rest small:p-8">
      {children}
    </div>
  </div>
)

const Star = ({ filled }: { filled: boolean }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2.8l2.83 5.74 6.33.92-4.58 4.46 1.08 6.3L12 17.25l-5.66 2.97 1.08-6.3L2.84 9.46l6.33-.92L12 2.8z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

const Stars = ({ value, readOnly = false, onChange }: {
  value: number
  readOnly?: boolean
  onChange?: (n: number) => void
}) => {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div
      className="flex justify-center gap-1 text-ui-fg-base"
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `${value} out of 5` : "Your rating"}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) =>
        readOnly ? (
          <Star key={n} filled={n <= value} />
        ) : (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} – ${LABELS[n - 1]}`}
            className="rounded p-1 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-border-interactive"
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange?.(n)}
            data-testid={`feedback-star-${n}`}
          >
            <Star filled={n <= shown} />
          </button>
        )
      )}
    </div>
  )
}

/**
 * An image that reports when it failed. The server-rendered <img> can fail
 * BEFORE React hydrates (onError never fires then), so also check on mount.
 */
const ArtImg = ({ src, alt, onBroken }: { src: string; alt: string; onBroken: () => void }) => {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const img = ref.current
    if (img && img.complete && img.naturalWidth === 0) onBroken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt} className="h-full w-full object-cover" onError={onBroken} />
  )
}

const Check = () => (
  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ui-tag-green-bg text-ui-tag-green-text">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
)

const KeepShopping = () => (
  <div className="mt-6 flex justify-center">
    <LocalizedClientLink href="/store">
      <Button variant="secondary">Keep shopping</Button>
    </LocalizedClientLink>
  </div>
)

export function FeedbackNotFound() {
  return (
    <Card>
      <div className="text-center" data-testid="feedback-not-found">
        <Heading level="h1" className="mb-2 text-2xl">
          We couldn&rsquo;t find this feedback link
        </Heading>
        <Text className="text-ui-fg-subtle">
          The link may be incomplete. Please open it again from the email we sent
          after your order arrived, or reply to that email and tell us how it went.
        </Text>
        <KeepShopping />
      </div>
    </Card>
  )
}

const Answered = ({ rating, comment, justSent }: {
  rating: number | null
  comment: string | null
  justSent: boolean
}) => (
  <Card>
    <div className="text-center" data-testid={justSent ? "feedback-thanks" : "feedback-already-answered"}>
      <Check />
      <Heading level="h1" className="mb-2 text-2xl">
        {justSent ? "Thank you!" : "You've already answered"}
      </Heading>
      <Text className="mb-4 text-ui-fg-subtle">
        {justSent
          ? "Your feedback reaches the people who made your order."
          : "Thanks, we already have your feedback for this order."}
      </Text>
      {rating ? <Stars value={rating} readOnly /> : null}
      {comment ? (
        <Text className="mt-4 whitespace-pre-line italic text-ui-fg-subtle">&ldquo;{comment}&rdquo;</Text>
      ) : null}
      <KeepShopping />
    </div>
  </Card>
)

export default function FeedbackTemplate({ view, feedbackId }: {
  view: FeedbackView
  feedbackId: string
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [artworkId, setArtworkId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [brokenArt, setBrokenArt] = useState<Set<string>>(() => new Set())
  const [done, setDone] = useState<null | "sent" | "already">(
    view.feedback.answered ? "already" : null
  )
  const [pending, startTransition] = useTransition()

  if (done) {
    const answeredRating =
      done === "sent" ? rating : view.feedback.rating ? RATING_NUMBER[view.feedback.rating] : null
    return (
      <Answered
        rating={answeredRating}
        comment={done === "sent" ? comment.trim() || null : view.feedback.comment}
        justSent={done === "sent"}
      />
    )
  }

  const items = view.order?.items ?? []
  const orderNo = view.order?.display_id != null ? `#${view.order.display_id}` : null
  // An image that fails to load is dropped, so a broken picture never shows.
  const artworks = view.artworks.filter((a) => a.file_path && !brokenArt.has(a.id))

  const onSubmit = () => {
    if (!rating) {
      setError("Please choose a rating first.")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await submitFeedback(feedbackId, {
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        ...(artworkId ? { artwork_id: artworkId } : {}),
      })
      if (res.ok) setDone("sent")
      else if (res.already_answered) setDone("already")
      else setError(res.error)
    })
  }

  return (
    <Card>
      <div className="mb-6 text-center">
        <Heading level="h1" className="text-2xl">
          How was your order{orderNo ? ` ${orderNo}` : ""}?
        </Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          It takes a few seconds and helps the makers behind it.
        </Text>
      </div>

      {items.length > 0 && (
        <ul className="mb-6 flex flex-col gap-3" data-testid="feedback-items">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-ui-bg-subtle">
                {it.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <Text weight="plus" className="truncate">
                  {it.title}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {[it.variant_title, it.quantity > 1 ? `Qty ${it.quantity}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-2">
        <Stars value={rating} onChange={(n) => { setRating(n); setError(null) }} />
        <Text size="small" className="mt-1 h-5 text-center text-ui-fg-subtle">
          {rating ? LABELS[rating - 1] : "Tap a star"}
        </Text>
      </div>

      {artworks.length > 0 && (
        <div className="mb-6">
          <Text weight="plus" className="mb-2 text-center">
            Which of these feels most like you? <span className="font-normal text-ui-fg-muted">(optional)</span>
          </Text>
          <div className="grid grid-cols-3 gap-2">
            {artworks.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setArtworkId(artworkId === a.id ? null : a.id)}
                aria-pressed={artworkId === a.id}
                className={`aspect-square overflow-hidden rounded-md border-2 transition ${
                  artworkId === a.id ? "border-ui-fg-base" : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <ArtImg
                  src={a.file_path as string}
                  alt={a.alt_text || a.title || "Artwork"}
                  onBroken={() => {
                    setBrokenArt((prev) => new Set(prev).add(a.id))
                    if (artworkId === a.id) setArtworkId(null)
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="mb-1 block">
        <Text size="small" weight="plus" className="mb-1">
          Anything you&rsquo;d like to tell us? <span className="font-normal text-ui-fg-muted">(optional)</span>
        </Text>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="How it fits, the fabric, the packaging, the delivery…"
          data-testid="feedback-comment"
        />
      </label>

      {error && (
        <Text size="small" className="mt-2 text-ui-fg-error" data-testid="feedback-error">
          {error}
        </Text>
      )}

      <Button
        className="mt-6 w-full"
        size="large"
        onClick={onSubmit}
        isLoading={pending}
        disabled={pending}
        data-testid="feedback-submit"
      >
        Send feedback
      </Button>
    </Card>
  )
}
