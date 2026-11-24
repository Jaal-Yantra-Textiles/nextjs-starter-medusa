"use client"

import { Button, Heading, Text } from "@medusajs/ui"
import { useState, useTransition } from "react"

import {
  saveBrief,
  type BriefOption,
  type BriefQuestion,
  type BriefStep,
  type BriefView,
} from "@lib/data/briefs"
import { convertToLocale } from "@lib/util/money"

/**
 * The buyer's brief (#2608 S1).
 *
 * She sees who would make each step (by name, with their sample photos), an
 * ESTIMATE where a workshop has a rate, "we'll confirm" where it doesn't and
 * "we're exploring partners" where nobody can yet. Every figure is labelled as
 * an estimate; the numbers come from the backend and are never computed here.
 */
const money = (amount: number, currency: string) =>
  convertToLocale({ amount, currency_code: currency })

const range = (low: number, high: number, currency: string) =>
  low === high ? money(low, currency) : `${money(low, currency)} – ${money(high, currency)}`

const STATUS_COPY: Record<BriefView["status"], string | null> = {
  draft: null,
  open: null,
  submitted: "Thanks, we have your brief. You can still change it until we start your samples.",
  sampling: "Your sample pieces are being made. We'll post photos and updates here.",
  quoted: "Your priced quote is ready. Check your email for the link.",
  closed: "This brief is closed.",
}

export default function BriefTemplate({ brief: initial, token }: { brief: BriefView; token: string }) {
  const [brief, setBrief] = useState(initial)
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(initial.questions.map((q) => [q.key, q.answer ?? (q.kind === "multi_choice" ? [] : "")]))
  )
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.options.filter((o) => o.buyer_selected).map((o) => o.id))
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const editable = brief.editable

  const persist = (extra: { submit?: boolean; step_choices?: Record<string, string | null> } = {}) => {
    setError(null)
    setSaved(null)
    startTransition(async () => {
      const cleaned = Object.fromEntries(
        Object.entries(answers).map(([k, v]) => [k, v === "" ? null : v])
      )
      const res = await saveBrief(token, {
        answers: cleaned,
        selected_option_ids: Array.from(selected),
        ...extra,
      })
      if (res.error || !res.brief) {
        setError(res.error ?? "Could not save.")
        return
      }
      setBrief(res.brief)
      setSaved(extra.submit ? "Sent. Thank you!" : extra.step_choices ? null : "Saved.")
    })
  }

  const pickChoice = (step: BriefStep, choiceId: string) => {
    if (!editable) return
    const next = step.selected_choice_id === choiceId ? null : choiceId
    persist({ step_choices: { [step.id]: next } })
  }

  const statusLine = STATUS_COPY[brief.status]
  // The questions only make sense once she has picked what she wants made.
  const showForm = selected.size > 0 || !!brief.submitted_at

  return (
    <div className="content-container py-12 max-w-6xl">
      <div className="flex flex-col gap-y-2">
        <Text className="text-ui-fg-subtle text-small-regular uppercase tracking-wide">
          Brief{brief.lead.name ? ` from ${brief.lead.name}` : ""}
        </Text>
        <Heading level="h1" className="text-2xl-semi text-ui-fg-base" data-testid="brief-title">
          {brief.title}
        </Heading>
        {brief.recipient_name && (
          <Text className="text-ui-fg-subtle">
            For {brief.recipient_name}
            {brief.recipient_company ? `, ${brief.recipient_company}` : ""}
          </Text>
        )}
        {brief.intro && <Text className="text-ui-fg-base mt-2 whitespace-pre-line">{brief.intro}</Text>}
      </div>

      {brief.link_state !== "live" && (
        <Banner tone="warn">
          {brief.link_state === "expired"
            ? "This link has expired. Ask us for a fresh one and nothing you entered is lost."
            : "This brief is closed."}
        </Banner>
      )}
      {statusLine && brief.link_state === "live" && <Banner tone="info">{statusLine}</Banner>}

      {brief.sample_quantity ? (
        <Section title="How this works">
          <ol className="list-decimal pl-5 flex flex-col gap-1 text-ui-fg-base">
            <li>You pick the options and workshops you like and answer a few questions.</li>
            <li>
              We make <strong>{brief.sample_quantity} sample pieces</strong> first and post photos here, on this
              same page.
            </li>
            <li>Once you're happy with the samples, we confirm every price and send you a quote to pay.</li>
          </ol>
        </Section>
      ) : null}

      {brief.updates.length > 0 && (
        <Section title="Updates">
          <ul className="flex flex-col gap-4" data-testid="brief-updates">
            {brief.updates.map((u) => (
              <li key={u.id} className="border-l-2 border-ui-border-strong pl-4">
                <Text className="text-ui-fg-muted text-small-regular">
                  {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                  {u.kind === "sample" ? " · Samples" : u.kind === "price" ? " · Price" : ""}
                </Text>
                <Text className="text-ui-fg-base whitespace-pre-line">{u.message}</Text>
                {u.media_urls.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {u.media_urls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-28 w-28 object-cover rounded-md border border-ui-border-base" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Banner tone="estimate">{brief.estimate_disclaimer}</Banner>

      <Section title="Options">
        <Text className="text-ui-fg-subtle -mt-2 mb-4">
          Tick the options you're interested in. You can pick more than one.
        </Text>
        <div className="grid gap-6 md:grid-cols-2 items-start" data-testid="brief-options">
          {brief.options.map((o) => (
            <OptionCard
              key={o.id}
              option={o}
              checked={selected.has(o.id)}
              editable={editable && !pending}
              onToggle={() => {
                const next = new Set(selected)
                next.has(o.id) ? next.delete(o.id) : next.add(o.id)
                setSelected(next)
              }}
              onPick={pickChoice}
            />
          ))}
        </div>
      </Section>

      {!showForm ? (
        <div className="mt-10 rounded-md border border-dashed border-ui-border-strong px-4 py-6 text-center" data-testid="brief-form-hint">
          <Text className="text-ui-fg-subtle">Tick at least one option above, then tell us about your order.</Text>
        </div>
      ) : (
      <Section title="About your order">
        <div className="flex flex-col gap-5 max-w-2xl" data-testid="brief-form">
          {brief.questions.map((q) => (
            <QuestionField
              key={q.id}
              q={q}
              value={answers[q.key]}
              disabled={!editable || pending}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
            />
          ))}
        </div>
      </Section>
      )}

      {error && (
        <Text className="text-ui-fg-error mt-4" data-testid="brief-error">
          {error}
        </Text>
      )}
      {saved && <Text className="text-ui-fg-interactive mt-4">{saved}</Text>}

      {editable && showForm && (
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" isLoading={pending} onClick={() => persist()} data-testid="brief-save">
            Save
          </Button>
          <Button isLoading={pending} onClick={() => persist({ submit: true })} data-testid="brief-send">
            {brief.submitted_at ? "Send changes" : "Send my brief"}
          </Button>
        </div>
      )}
    </div>
  )
}

function OptionCard({
  option,
  checked,
  editable,
  onToggle,
  onPick,
}: {
  option: BriefOption
  checked: boolean
  editable: boolean
  onToggle: () => void
  onPick: (step: BriefStep, choiceId: string) => void
}) {
  const e = option.estimate
  const hasFigure = e.per_piece_high > 0
  return (
    <div
      className={`rounded-lg border p-5 ${checked ? "border-ui-border-interactive" : "border-ui-border-base"}`}
      data-testid="brief-option"
    >
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" className="mt-1.5" checked={checked} disabled={!editable} onChange={onToggle} />
        <div>
          <Heading level="h2" className="text-xl-semi">
            {option.title}
          </Heading>
          {option.description && <Text className="text-ui-fg-subtle">{option.description}</Text>}
          <Text className="text-ui-fg-muted text-small-regular">I'm interested in this option</Text>
        </div>
      </label>

      <ol className="mt-4 flex flex-col gap-4">
        {option.steps.map((s, i) => (
          <li key={s.id}>
            <Text className="text-base-semi">
              {i + 1}. {s.label}
              {s.technique_label && s.technique_label !== s.label ? (
                <span className="text-ui-fg-muted font-normal"> · {s.technique_label}</span>
              ) : null}
            </Text>
            {s.note && <Text className="text-ui-fg-subtle text-small-regular">{s.note}</Text>}
            {s.state === "exploring" ? (
              <Text className="text-ui-fg-subtle italic mt-1" data-testid="step-exploring">
                We're exploring partners for this step.
              </Text>
            ) : (
              <div className="mt-2 grid gap-2">
                {s.choices.map((c) => {
                  const picked = s.selected_choice_id === c.id
                  return (
                    <button
                      type="button"
                      key={c.id}
                      disabled={!editable || s.choices.length < 2}
                      onClick={() => onPick(s, c.id)}
                      className={`text-left rounded-md border p-3 ${
                        picked ? "border-ui-border-interactive bg-ui-bg-highlight" : "border-ui-border-base"
                      } ${s.choices.length > 1 && editable ? "hover:border-ui-border-strong" : "cursor-default"}`}
                      data-testid="step-choice"
                    >
                      <Text className="text-base-semi">{c.partner.name}</Text>
                      <Text className="text-small-regular text-ui-fg-subtle">
                        {c.estimate
                          ? `≈ ${range(c.estimate.low, c.estimate.high, c.estimate.currency_code)} per piece${
                              c.estimate.qty_per_piece !== 1 ? ` (${c.estimate.qty_per_piece} ${c.estimate.unit})` : ""
                            }`
                          : "Price: we'll confirm"}
                      </Text>
                      {c.estimate && !c.estimate.rate_confirmed && (
                        <Text className="text-small-regular text-ui-fg-muted">Rate not yet confirmed by the workshop</Text>
                      )}
                      {c.estimate?.stale && (
                        <Text className="text-small-regular text-ui-fg-muted">Older rate, we'll recheck it</Text>
                      )}
                      {c.note && <Text className="text-small-regular text-ui-fg-subtle">{c.note}</Text>}
                      {c.samples.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {c.samples
                            .flatMap((smp) => smp.photos.slice(0, 2).map((p) => ({ p, t: smp.title })))
                            .slice(0, 4)
                            .map(({ p, t }) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={p} src={p} alt={t} title={t} className="h-14 w-14 object-cover rounded border border-ui-border-base" />
                            ))}
                        </div>
                      )}
                      {c.samples.length > 0 && c.samples.every((smp) => !smp.photos.length) && (
                        <Text className="text-small-regular text-ui-fg-muted mt-1">
                          Past work: {c.samples.map((smp) => smp.title).join(", ")}
                        </Text>
                      )}
                      {s.choices.length > 1 && editable && (
                        <Text className="text-small-regular text-ui-fg-interactive mt-1">
                          {picked ? "Your pick (tap to undo)" : "Pick this workshop"}
                        </Text>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-md bg-ui-bg-subtle p-4" data-testid="option-estimate">
        <Text className="text-small-regular text-ui-fg-muted uppercase tracking-wide">Estimate, not a confirmed price</Text>
        {hasFigure ? (
          <>
            <Text className="text-large-semi">
              {range(e.per_piece_low, e.per_piece_high, e.currency_code)}{" "}
              <span className="text-base-regular text-ui-fg-subtle">per piece{e.complete ? "" : ", so far"}</span>
            </Text>
            {e.setup_total > 0 && (
              <Text className="text-ui-fg-subtle">+ {money(e.setup_total, e.currency_code)} one-time setup</Text>
            )}
            {e.quantity && e.total_low != null && e.total_high != null && (
              <Text className="text-ui-fg-base">
                For {e.quantity} pieces: {range(e.total_low, e.total_high, e.currency_code)}
              </Text>
            )}
          </>
        ) : (
          <Text className="text-ui-fg-subtle">No estimate yet. We'll confirm prices with the workshops.</Text>
        )}
        {e.pending_steps.length > 0 && (
          <Text className="text-ui-fg-subtle mt-1">Still to confirm: {e.pending_steps.join(", ")}</Text>
        )}
        {e.has_unconfirmed && (
          <Text className="text-ui-fg-muted text-small-regular">Includes rates the workshop has not confirmed yet.</Text>
        )}
        <Text className="text-ui-fg-muted text-small-regular mt-1">Freight and taxes are not included.</Text>
      </div>
    </div>
  )
}

function QuestionField({
  q,
  value,
  disabled,
  onChange,
}: {
  q: BriefQuestion
  value: unknown
  disabled: boolean
  onChange: (v: unknown) => void
}) {
  const id = `q-${q.key}`
  const input =
    "w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-base-regular disabled:opacity-70"
  const label = (
    <label htmlFor={id} className="text-base-semi">
      {q.label}
      {q.required && <span className="text-ui-fg-error"> *</span>}
    </label>
  )
  const help = q.help ? <Text className="text-small-regular text-ui-fg-muted">{q.help}</Text> : null

  if (q.kind === "multi_choice" || q.kind === "choice") {
    const current = q.kind === "multi_choice" ? (Array.isArray(value) ? (value as string[]) : []) : (value as string)
    return (
      <fieldset className="flex flex-col gap-1">
        <legend className="text-base-semi mb-1">
          {q.label}
          {q.required && <span className="text-ui-fg-error"> *</span>}
        </legend>
        {help}
        <div className="flex flex-wrap gap-2 mt-1">
          {(q.options ?? []).map((opt) => {
            const on = q.kind === "multi_choice" ? (current as string[]).includes(opt) : current === opt
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (q.kind === "multi_choice") {
                    const list = current as string[]
                    onChange(on ? list.filter((x) => x !== opt) : [...list, opt])
                  } else {
                    onChange(on ? "" : opt)
                  }
                }}
                className={`rounded-full border px-3 py-1 text-small-regular ${
                  on ? "border-ui-border-interactive bg-ui-bg-highlight" : "border-ui-border-base"
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </fieldset>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {label}
      {help}
      {q.kind === "long_text" ? (
        <textarea id={id} rows={3} className={input} disabled={disabled} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      ) : q.kind === "boolean" ? (
        <input id={id} type="checkbox" disabled={disabled} checked={value === true} onChange={(e) => onChange(e.target.checked)} />
      ) : (
        <input
          id={id}
          className={input}
          disabled={disabled}
          type={q.kind === "number" ? "number" : q.kind === "date" ? "date" : q.kind === "link" ? "url" : "text"}
          min={q.kind === "number" ? 1 : undefined}
          value={String(value ?? "")}
          onChange={(e) => onChange(q.kind === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)}
        />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <Heading level="h2" className="text-xl-semi mb-4">
        {title}
      </Heading>
      {children}
    </section>
  )
}

function Banner({ tone, children }: { tone: "info" | "warn" | "estimate"; children: React.ReactNode }) {
  const cls =
    tone === "warn"
      ? "border-ui-tag-red-border bg-ui-tag-red-bg"
      : tone === "estimate"
        ? "border-ui-tag-orange-border bg-ui-tag-orange-bg"
        : "border-ui-tag-blue-border bg-ui-tag-blue-bg"
  return (
    <div className={`mt-6 rounded-md border px-4 py-3 ${cls}`} data-testid={`brief-banner-${tone}`}>
      <Text className="text-ui-fg-base">{children}</Text>
    </div>
  )
}
