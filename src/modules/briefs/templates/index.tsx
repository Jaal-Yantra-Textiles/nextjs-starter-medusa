"use client"

import { Button, Heading, Text } from "@medusajs/ui"
import { useState, useTransition } from "react"

import {
  saveBrief,
  type BriefFile,
  type BriefFx,
  type BriefOption,
  type BriefQuestion,
  type BriefStep,
  type BriefView,
} from "@lib/data/briefs"
import { convertToLocale } from "@lib/util/money"

/**
 * The buyer's brief (#2608 S1), as a wizard.
 *
 *   Welcome (first visit) → 1 Style → 2 Workshops → 3 Details → 4 Review & send
 *   → Status (updates, sample photos), with "Edit my brief" until sampling.
 *
 * Every figure is an ESTIMATE from the backend; nothing is priced here.
 * Progress is saved on every Next, so she can leave and come back.
 */
const money = (amount: number, currency: string) => convertToLocale({ amount, currency_code: currency })
const range = (low: number, high: number, currency: string) =>
  low === high ? money(low, currency) : `${money(low, currency)} – ${money(high, currency)}`

type LinkCtx = { token: string; countryCode: string }

type Screen = "welcome" | "style" | "workshops" | "details" | "review" | "status"
const STEPS: { key: Screen; label: string }[] = [
  { key: "style", label: "Style" },
  { key: "workshops", label: "Workshops" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
]

const firstScreen = (b: BriefView): Screen => {
  if (b.submitted_at || !b.editable) return "status"
  const started = b.options.some((o) => o.buyer_selected) || b.questions.some((q) => q.answer != null)
  return started ? "style" : "welcome"
}

const fxNote = (fx: BriefFx): string | null =>
  fx.converted && fx.rate
    ? `Shown in ${fx.display_currency.toUpperCase()}, converted from ${fx.base_currency.toUpperCase()} at today's rate. Workshops quote in ${fx.base_currency.toUpperCase()}, so the final figure moves with the exchange rate.`
    : fx.reason

export default function BriefTemplate({
  brief: initial,
  token,
  countryCode,
}: {
  brief: BriefView
  token: string
  countryCode: string
}) {
  const [brief, setBrief] = useState(initial)
  const [screen, setScreen] = useState<Screen>(() => firstScreen(initial))
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      initial.questions.map((q) => [q.key, q.answer ?? (q.kind === "multi_choice" || q.kind === "file" ? [] : "")])
    )
  )
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.options.filter((o) => o.buyer_selected).map((o) => o.id))
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const editable = brief.editable

  const go = (next: Screen) => {
    setScreen(next)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const persist = (
    extra: { submit?: boolean; step_choices?: Record<string, string | null> } = {},
    then?: Screen
  ) => {
    setError(null)
    startTransition(async () => {
      const cleaned = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v === "" ? null : v]))
      const res = await saveBrief(token, countryCode, { answers: cleaned, selected_option_ids: Array.from(selected), ...extra })
      if (res.error || !res.brief) {
        setError(res.error ?? "Could not save. Please try again.")
        return
      }
      setBrief(res.brief)
      if (then) go(then)
    })
  }

  const pickChoice = (step: BriefStep, choiceId: string) => {
    if (!editable) return
    persist({ step_choices: { [step.id]: step.selected_choice_id === choiceId ? null : choiceId } })
  }

  const chosen = brief.options.filter((o) => selected.has(o.id))
  const fxLine = fxNote(brief.fx)
  const onUploaded = (next: BriefView) => {
    setBrief(next)
    setAnswers((a) => ({
      ...a,
      ...Object.fromEntries(next.questions.filter((q) => q.kind === "file").map((q) => [q.key, q.answer ?? []])),
    }))
  }
  const stepIndex = STEPS.findIndex((s) => s.key === screen)

  return (
    <div className="content-container py-10 max-w-5xl">
      <Header brief={brief} />

      {brief.link_state !== "live" && (
        <Banner tone="warn">
          {brief.link_state === "expired"
            ? "This link has expired. Ask us for a fresh one; nothing you entered is lost."
            : "This brief is closed."}
        </Banner>
      )}

      {stepIndex >= 0 && <Progress current={stepIndex} onJump={(i) => i < stepIndex && go(STEPS[i].key)} />}

      {screen === "welcome" && <Welcome brief={brief} onStart={() => go("style")} />}

      {screen === "style" && (
        <Panel
          title="Which style do you like?"
          lead="Pick one or more. Each style is made by a different mix of workshops. You can change your mind later."
        >
          <div className="grid gap-4 md:grid-cols-2" data-testid="brief-styles">
            {brief.options.map((o) => (
              <StyleCard
                key={o.id}
                option={o}
                checked={selected.has(o.id)}
                disabled={!editable || pending}
                onToggle={() => {
                  const next = new Set(selected)
                  next.has(o.id) ? next.delete(o.id) : next.add(o.id)
                  setSelected(next)
                }}
              />
            ))}
          </div>
          <Nav
            pending={pending}
            back={() => go("welcome")}
            next={() => persist({}, "workshops")}
            nextDisabled={!selected.size}
            nextHint={!selected.size ? "Pick at least one style" : null}
          />
        </Panel>
      )}

      {screen === "workshops" && (
        <Panel
          title="Who would you like to make it?"
          lead="These are the workshops for each step, with work they've done before. Pick one where there's a choice, or leave it and we'll recommend one."
        >
          <OptionTabs
            options={chosen}
            testId="brief-workshops"
            render={(o) => (
              <>
                <ol className="flex flex-col gap-5">
                  {o.steps.map((s, i) => (
                    <StepPicker key={s.id} index={i} step={s} editable={editable && !pending} onPick={pickChoice} />
                  ))}
                </ol>
                <StoryBox option={o} link={{ token, countryCode }} />
                <TimelineBox option={o} />
                <EstimateBox option={o} compact fxLine={fxLine} />
              </>
            )}
          />
          <Nav pending={pending} back={() => go("style")} next={() => persist({}, "details")} />
        </Panel>
      )}

      {screen === "details" && (
        <Panel title="Tell us about your order" lead="A best guess is fine. The quantity is what the estimate is based on.">
          <div className="flex flex-col gap-5 max-w-2xl" data-testid="brief-form">
            {brief.questions.map((q) => (
              <QuestionField
                key={q.id}
                q={q}
                value={answers[q.key]}
                disabled={!editable || pending}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
                upload={{ token, countryCode, onUploaded }}
              />
            ))}
          </div>
          <Nav pending={pending} back={() => go("workshops")} next={() => persist({}, "review")} nextLabel="Review" />
        </Panel>
      )}

      {screen === "review" && (
        <Panel title="Check and send" lead="Here's what we'll take to the workshops.">
          <Banner tone="estimate">{brief.estimate_disclaimer}</Banner>
          {fxLine && <Text className="text-small-regular text-ui-fg-muted -mt-2">{fxLine}</Text>}
          <Summary brief={brief} chosen={chosen} link={{ token, countryCode }} fxLine={fxLine} />
          <Nav
            pending={pending}
            back={() => go("details")}
            next={() => persist({ submit: true }, "status")}
            nextLabel={brief.submitted_at ? "Send changes" : "Send my brief"}
          />
        </Panel>
      )}

      {screen === "status" && (
        <StatusView
          brief={brief}
          chosen={chosen}
          onEdit={editable ? () => go("style") : null}
          link={{ token, countryCode }}
        />
      )}

      {error && (
        <Text className="text-ui-fg-error mt-4" data-testid="brief-error">
          {error}
        </Text>
      )}
    </div>
  )
}

/* ---------- screens ---------- */

function Header({ brief }: { brief: BriefView }) {
  return (
    <div className="flex flex-col gap-1 mb-6">
      <Text className="text-ui-fg-subtle text-small-regular uppercase tracking-wide">
        {brief.lead.name ? `Prepared by ${brief.lead.name}` : "Your brief"}
        {brief.recipient_name ? ` for ${brief.recipient_name}` : ""}
      </Text>
      <Heading level="h1" className="text-2xl-semi text-ui-fg-base" data-testid="brief-title">
        {brief.title}
      </Heading>
    </div>
  )
}

function Welcome({ brief, onStart }: { brief: BriefView; onStart: () => void }) {
  const workshops = new Set(brief.options.flatMap((o) => o.steps.flatMap((s) => s.choices.map((c) => c.partner.id))))
  const steps = [
    { n: 1, title: "Choose a style", body: `${brief.options.length} ways your piece could be made.` },
    { n: 2, title: "Meet the workshops", body: `${workshops.size} workshops, with work they've made before. Pick who makes what.` },
    { n: 3, title: "Tell us the details", body: "Quantity, size, colours, artwork and when you need it." },
    {
      n: 4,
      title: brief.sample_quantity ? `We make ${brief.sample_quantity} samples` : "We confirm prices",
      body: brief.sample_quantity
        ? "Photos appear on this page. Once you're happy, we confirm every price and send a quote to pay."
        : "We check every figure with the workshops and send a quote to pay.",
    },
  ]
  return (
    <section data-testid="brief-welcome">
      {brief.intro && <Text className="text-large-regular text-ui-fg-base max-w-3xl whitespace-pre-line">{brief.intro}</Text>}
      <Heading level="h2" className="text-xl-semi mt-8 mb-4">
        How it works
      </Heading>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li key={s.n} className="rounded-lg border border-ui-border-base p-4 flex flex-col gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ui-bg-interactive text-ui-fg-on-color text-base-semi">
              {s.n}
            </span>
            <Text className="text-base-semi">{s.title}</Text>
            <Text className="text-ui-fg-subtle text-small-regular">{s.body}</Text>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-md bg-ui-bg-subtle px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6">
        <Text className="text-ui-fg-base">⏱ About 3 minutes</Text>
        <Text className="text-ui-fg-base">Nothing to pay now</Text>
        <Text className="text-ui-fg-base">Prices shown are estimates until we confirm them</Text>
      </div>
      <div className="mt-8">
        <Button size="large" onClick={onStart} data-testid="brief-start">
          Let's start
        </Button>
      </div>
    </section>
  )
}

function StyleCard({
  option,
  checked,
  disabled,
  onToggle,
}: {
  option: BriefOption
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const e = option.estimate
  const exploring = option.steps.filter((s) => s.state === "exploring").length
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={checked}
      className={`text-left rounded-lg border-2 p-5 transition-colors ${
        checked ? "border-ui-border-interactive bg-ui-bg-highlight" : "border-ui-border-base hover:border-ui-border-strong"
      }`}
      data-testid="brief-style"
    >
      <div className="flex items-start justify-between gap-3">
        <Heading level="h3" className="text-large-semi">
          {option.title}
        </Heading>
        <span
          className={`mt-1 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center text-[12px] ${
            checked ? "border-ui-border-interactive bg-ui-bg-interactive text-ui-fg-on-color" : "border-ui-border-strong"
          }`}
        >
          {checked ? "✓" : ""}
        </span>
      </div>
      {option.description && <Text className="text-ui-fg-subtle mt-1">{option.description}</Text>}
      {option.story.headline && (
        <Text className="text-small-regular text-ui-fg-base mt-2 italic">“{option.story.headline}”</Text>
      )}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {option.steps.map((s) => (
          <span
            key={s.id}
            className={`rounded-full px-2.5 py-0.5 text-small-regular border ${
              s.state === "exploring" ? "border-dashed border-ui-border-strong text-ui-fg-muted" : "border-ui-border-base"
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>
      <div className="mt-4">
        {e.per_piece_high > 0 ? (
          <Text className="text-ui-fg-base">
            <span className="text-base-semi">≈ {range(e.per_piece_low, e.per_piece_high, e.currency_code)}</span>{" "}
            <span className="text-ui-fg-subtle">per piece{e.complete ? "" : " so far"}</span>
          </Text>
        ) : (
          <Text className="text-ui-fg-subtle">Prices to confirm</Text>
        )}
        {exploring > 0 && (
          <Text className="text-small-regular text-ui-fg-muted">
            We're still finding a workshop for {exploring === 1 ? "one step" : `${exploring} steps`}
          </Text>
        )}
      </div>
    </button>
  )
}

function StepPicker({
  index,
  step,
  editable,
  onPick,
}: {
  index: number
  step: BriefStep
  editable: boolean
  onPick: (s: BriefStep, choiceId: string) => void
}) {
  return (
    <li>
      <Text className="text-base-semi">
        {index + 1}. {step.label}
      </Text>
      {step.note && <Text className="text-small-regular text-ui-fg-subtle">{step.note}</Text>}
      {step.state === "exploring" ? (
        <div className="mt-2 rounded-md border border-dashed border-ui-border-strong px-3 py-2">
          <Text className="text-ui-fg-subtle">We're exploring partners for this step and will come back to you.</Text>
        </div>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {step.choices.map((c) => (
            <WorkshopCard
              key={c.id}
              choice={c}
              picked={step.selected_choice_id === c.id}
              choosable={editable && step.choices.length > 1}
              onPick={() => onPick(step, c.id)}
            />
          ))}
        </div>
      )}
    </li>
  )
}

/** One workshop for one step: price, past work, and who they are (public profile only). */
function WorkshopCard({
  choice: c,
  picked,
  choosable,
  onPick,
}: {
  choice: BriefStep["choices"][number]
  picked: boolean
  choosable: boolean
  onPick: () => void
}) {
  const [open, setOpen] = useState(false)
  const w = c.partner
  const photos = [...c.samples.flatMap((s) => s.photos), ...(w.photos ?? [])].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)
  const hasProfile = !!(w.profile_url || w.tagline || w.about || w.team_size || w.pieces_made)
  const lead = c.estimate?.lead_days
  return (
    <div
      className={`rounded-md border-2 p-3 flex flex-col ${picked ? "border-ui-border-interactive bg-ui-bg-highlight" : "border-ui-border-base"}`}
      data-testid="step-choice"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {w.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={w.logo} alt="" className="h-7 w-7 rounded-full object-cover border border-ui-border-base" />
          )}
          <Text className="text-base-semi">{w.name}</Text>
        </div>
        {picked && <span className="text-small-regular text-ui-fg-interactive">✓ Your pick</span>}
      </div>
      {w.tagline && <Text className="text-small-regular text-ui-fg-subtle italic">{w.tagline}</Text>}
      <Text className="text-small-regular text-ui-fg-base mt-1">
        {c.estimate ? `≈ ${range(c.estimate.low, c.estimate.high, c.estimate.currency_code)} per piece` : "Price: we'll confirm"}
        {lead ? ` · about ${lead} days` : ""}
      </Text>
      {c.note && <Text className="text-small-regular text-ui-fg-subtle">{c.note}</Text>}
      {photos.length > 0 ? (
        <div className="flex gap-1.5 mt-2">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p} src={p} alt="" className="h-14 w-14 object-cover rounded border border-ui-border-base" />
          ))}
        </div>
      ) : c.samples.length > 0 ? (
        <Text className="text-small-regular text-ui-fg-muted mt-1">Has made: {c.samples.map((s) => s.title).join(", ")}</Text>
      ) : null}
      {c.estimate && !c.estimate.rate_confirmed && <Text className="text-small-regular text-ui-fg-muted">Rate not yet confirmed</Text>}

      {hasProfile && (
        <button type="button" className="text-left text-small-regular text-ui-fg-interactive mt-2" onClick={() => setOpen(!open)} data-testid="workshop-about">
          {open ? "Hide" : "About this workshop"}
        </button>
      )}
      {open && (
        <div className="mt-2 rounded border border-ui-border-base bg-ui-bg-base p-2 flex flex-col gap-1" data-testid="workshop-profile">
          {w.about && <Text className="text-small-regular text-ui-fg-base">{w.about}</Text>}
          {(w.team_size || w.roles.length > 0) && (
            <Text className="text-small-regular text-ui-fg-subtle">
              {w.team_size ? `Team of ${w.team_size}` : ""}
              {w.team_size && w.roles.length ? ": " : ""}
              {w.roles.map((r) => `${r.count} ${r.role}`).join(", ")}
            </Text>
          )}
          {!!w.pieces_made && (
            <Text className="text-small-regular text-ui-fg-subtle">
              {w.pieces_made} pieces made with us{w.making_since ? ` since ${new Date(w.making_since).getUTCFullYear()}` : ""}
            </Text>
          )}
        </div>
      )}
      {(w.profile_url || w.store_url) && (
        <div className="flex flex-wrap gap-x-3 mt-2">
          {w.profile_url && (
            <a href={w.profile_url} target="_blank" rel="noreferrer" className="text-small-regular underline text-ui-fg-subtle">
              Their page ↗
            </a>
          )}
          {w.store_url && (
            <a href={w.store_url} target="_blank" rel="noreferrer" className="text-small-regular underline text-ui-fg-subtle">
              Their shop ↗
            </a>
          )}
        </div>
      )}
      {choosable && (
        <Button size="small" variant={picked ? "secondary" : "primary"} className="mt-3 self-start" onClick={onPick} data-testid="pick-workshop">
          {picked ? "Undo pick" : "Pick this workshop"}
        </Button>
      )}
    </div>
  )
}

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })

const VERDICT: Record<string, { text: string; cls: string }> = {
  on_track: { text: "On track for your date", cls: "bg-ui-tag-green-bg border-ui-tag-green-border" },
  tight: { text: "Tight for your date: we'll plan it closely", cls: "bg-ui-tag-orange-bg border-ui-tag-orange-border" },
  too_soon: { text: "Too soon for your date: let's talk about options", cls: "bg-ui-tag-red-bg border-ui-tag-red-border" },
  unknown: { text: "We'll confirm the timing against your date", cls: "bg-ui-bg-subtle border-ui-border-base" },
}

/** Samples, then production after she approves them, checked against her date. Estimates. */
function TimelineBox({ option }: { option: BriefOption }) {
  const t = option.timeline
  if (!t.sample_days && t.production_high == null && !t.unknown_steps.length) return null
  const v = t.verdict ? VERDICT[t.verdict] : null
  return (
    <div className="mt-4 rounded-md border border-ui-border-base p-4" data-testid="option-timeline">
      <Text className="text-small-regular text-ui-fg-muted uppercase tracking-wide">Timeline, estimated</Text>
      <ol className="mt-2 flex flex-col gap-1">
        <li>
          <Text className="text-small-regular">
            <span className="text-base-semi">Samples:</span>{" "}
            {t.sample_days ? `about ${t.sample_days} days after you send this brief` : "we'll confirm"}
          </Text>
        </li>
        <li>
          <Text className="text-small-regular">
            <span className="text-base-semi">Production:</span>{" "}
            {t.production_high != null
              ? `${t.production_low === t.production_high ? t.production_high : `${t.production_low}–${t.production_high}`} days after you approve the samples`
              : "we'll confirm"}
            {t.unknown_steps.length ? <span className="text-ui-fg-subtle"> (still to confirm: {t.unknown_steps.join(", ")})</span> : null}
          </Text>
        </li>
        {t.ready_low && t.ready_high && (
          <li>
            <Text className="text-small-regular">
              <span className="text-base-semi">Ready to ship:</span> around{" "}
              {t.ready_low === t.ready_high ? fmtDate(t.ready_high) : `${fmtDate(t.ready_low)} – ${fmtDate(t.ready_high)}`}, if you approve samples
              the day they arrive
            </Text>
          </li>
        )}
      </ol>
      {v && t.deadline && (
        <div className={`mt-2 rounded border px-3 py-1.5 ${v.cls}`} data-testid="timeline-verdict">
          <Text className="text-small-regular">
            You need them by {fmtDate(t.deadline)}. {v.text}.
          </Text>
        </div>
      )}
      <Text className="text-ui-fg-muted text-small-regular mt-1">Shipping time is not included.</Text>
    </div>
  )
}

function EstimateBox({ option, compact = false, fxLine = null }: { option: BriefOption; compact?: boolean; fxLine?: string | null }) {
  const e = option.estimate
  return (
    <div className={`rounded-md bg-ui-bg-subtle p-4 ${compact ? "mt-4" : ""}`} data-testid="option-estimate">
      <Text className="text-small-regular text-ui-fg-muted uppercase tracking-wide">Estimate, not a confirmed price</Text>
      {e.per_piece_high > 0 ? (
        <>
          <Text className="text-large-semi">
            {range(e.per_piece_low, e.per_piece_high, e.currency_code)}{" "}
            <span className="text-base-regular text-ui-fg-subtle">per piece{e.complete ? "" : ", so far"}</span>
          </Text>
          {e.setup_total > 0 && <Text className="text-ui-fg-subtle">+ {money(e.setup_total, e.currency_code)} one-time setup</Text>}
          {e.quantity && e.total_low != null && e.total_high != null && (
            <Text>
              For {e.quantity} pieces: {range(e.total_low, e.total_high, e.currency_code)}
            </Text>
          )}
        </>
      ) : (
        <Text className="text-ui-fg-subtle">No figure yet. We'll confirm with the workshops.</Text>
      )}
      {e.pending_steps.length > 0 && <Text className="text-ui-fg-subtle">Still to confirm: {e.pending_steps.join(", ")}</Text>}
      <Text className="text-ui-fg-muted text-small-regular mt-1">Freight and taxes not included.</Text>
      {fxLine && <Text className="text-ui-fg-muted text-small-regular">{fxLine}</Text>}
    </div>
  )
}

/** What she can tell HER customers: our line for the style, plus one factual line per craft. */
function StoryBox({ option, link }: { option: BriefOption; link: LinkCtx }) {
  const { token, countryCode } = link
  const { headline, points } = option.story
  if (!headline && !points.length) return null
  const card = `/api/briefs/${encodeURIComponent(token)}/story-card?option=${encodeURIComponent(option.id)}&country=${encodeURIComponent(countryCode)}`
  return (
    <div className="mt-5 rounded-md border border-ui-border-base p-4" data-testid="option-story">
      <Text className="text-small-regular text-ui-fg-muted uppercase tracking-wide">The story you can tell your customers</Text>
      {headline && <Text className="text-base-regular text-ui-fg-base mt-1 italic">“{headline}”</Text>}
      <ul className="mt-2 flex flex-col gap-1.5">
        {points.map((p) => (
          <li key={p.label}>
            <Text className="text-small-regular">
              <span className="text-base-semi">{p.label}.</span> {p.text}
              {p.by?.length ? <span className="text-ui-fg-subtle"> By {p.by.join(" or ")}.</span> : null}
            </Text>
          </li>
        ))}
      </ul>
      <a
        href={card}
        download={`story-${option.title.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}.png`}
        className="inline-block mt-3 text-small-regular underline text-ui-fg-interactive"
        data-testid="story-card-download"
      >
        Download story card (image)
      </a>
    </div>
  )
}

function Summary({
  brief,
  chosen,
  link,
  fxLine = null,
}: {
  brief: BriefView
  chosen: BriefOption[]
  link: LinkCtx
  fxLine?: string | null
}) {
  const answered = brief.questions.filter((q) => q.answer != null && !(Array.isArray(q.answer) && !q.answer.length))
  return (
    <div className="flex flex-col gap-6 mt-6" data-testid="brief-summary">
      <OptionTabs
        options={chosen}
        render={(o) => (
        <>
          <ul className="flex flex-col gap-1">
            {o.steps.map((s) => {
              const pick = s.choices.find((c) => c.id === s.selected_choice_id)
              return (
                <li key={s.id} className="flex flex-wrap gap-x-2">
                  <Text className="text-ui-fg-subtle min-w-[10rem]">{s.label}</Text>
                  <Text className="text-ui-fg-base">
                    {s.state === "exploring"
                      ? "Workshop to be found"
                      : pick
                        ? pick.partner.name
                        : s.choices.length === 1
                          ? s.choices[0].partner.name
                          : `We'll recommend (${s.choices.map((c) => c.partner.name).join(" or ")})`}
                  </Text>
                </li>
              )
            })}
          </ul>
          <StoryBox option={o} link={link} />
          <TimelineBox option={o} />
          <EstimateBox option={o} compact fxLine={fxLine} />
        </>
        )}
      />
      {answered.length > 0 && (
        <div className="rounded-lg border border-ui-border-base p-5">
          <Heading level="h3" className="text-large-semi mb-2">
            Your details
          </Heading>
          <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[14rem_1fr]">
            {answered.map((q) => (
              <div key={q.id} className="contents">
                <dt className="text-ui-fg-subtle">{q.label}</dt>
                <dd className="text-ui-fg-base break-words">
                  {q.kind === "file"
                    ? (q.answer as BriefFile[]).map((f) => f.name).join(", ")
                    : Array.isArray(q.answer)
                      ? q.answer.join(", ")
                      : String(q.answer)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

function StatusView({
  brief,
  chosen,
  onEdit,
  link,
}: {
  brief: BriefView
  chosen: BriefOption[]
  onEdit: (() => void) | null
  link: LinkCtx
}) {
  const stage = brief.status === "sampling" ? 2 : brief.status === "quoted" || brief.status === "closed" ? 3 : 1
  const stages = ["Brief sent", brief.sample_quantity ? `${brief.sample_quantity} samples being made` : "Workshops checking", "Prices confirmed"]
  return (
    <section data-testid="brief-status">
      <ol className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center">
        {stages.map((label, i) => (
          <li key={label} className="flex items-center gap-2 sm:flex-1">
            <span
              className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-small-semi ${
                i < stage ? "bg-ui-bg-interactive text-ui-fg-on-color" : "border-2 border-ui-border-strong text-ui-fg-muted"
              }`}
            >
              {i < stage ? "✓" : i + 1}
            </span>
            <Text className={i < stage ? "text-base-semi" : "text-ui-fg-muted"}>{label}</Text>
            {i < stages.length - 1 && <span className="hidden sm:block flex-1 h-px bg-ui-border-base mx-3" />}
          </li>
        ))}
      </ol>

      <Heading level="h2" className="text-xl-semi mt-10 mb-4">
        Updates
      </Heading>
      {brief.updates.length ? (
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
      ) : (
        <Text className="text-ui-fg-subtle">Nothing yet. We'll post here as soon as the workshops come back.</Text>
      )}

      <Heading level="h2" className="text-xl-semi mt-10 mb-2">
        What you asked for
      </Heading>
      <Summary brief={brief} chosen={chosen} link={link} fxLine={fxNote(brief.fx)} />

      {onEdit ? (
        <div className="mt-6">
          <Button variant="secondary" onClick={onEdit} data-testid="brief-edit">
            Edit my brief
          </Button>
          <Text className="text-small-regular text-ui-fg-muted mt-1">You can change it until we start your samples.</Text>
        </div>
      ) : brief.status === "sampling" ? (
        <Text className="text-ui-fg-subtle mt-6">Your samples are being made from this brief, so it can't be changed here. Message us for any change.</Text>
      ) : null}
    </section>
  )
}

/* ---------- pieces ---------- */

/** One chosen style at a time. A single style shows without a tab bar. */
function OptionTabs({
  options,
  render,
  testId,
}: {
  options: BriefOption[]
  render: (o: BriefOption) => React.ReactNode
  testId?: string
}) {
  const [activeId, setActiveId] = useState<string | null>(options[0]?.id ?? null)
  const active = options.find((o) => o.id === activeId) ?? options[0]
  if (!active) return null
  return (
    <div className="rounded-lg border border-ui-border-base" data-testid={testId}>
      {options.length > 1 ? (
        <div role="tablist" className="flex overflow-x-auto border-b border-ui-border-base" data-testid="option-tabs">
          {options.map((o) => {
            const on = o.id === active.id
            const e = o.estimate
            return (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActiveId(o.id)}
                className={`px-5 py-3 text-left whitespace-nowrap border-b-2 -mb-px ${
                  on ? "border-ui-border-interactive text-ui-fg-base" : "border-transparent text-ui-fg-muted hover:text-ui-fg-base"
                }`}
              >
                <span className="block text-base-semi">{o.title}</span>
                <span className="block text-small-regular">
                  {e.per_piece_high > 0 ? `≈ ${range(e.per_piece_low, e.per_piece_high, e.currency_code)}${e.complete ? "" : " so far"}` : "Prices to confirm"}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="px-5 pt-4">
          <Heading level="h3" className="text-large-semi">
            {active.title}
          </Heading>
        </div>
      )}
      <div role="tabpanel" className="p-5">
        {render(active)}
      </div>
    </div>
  )
}

function Progress({ current, onJump }: { current: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex gap-2 mb-8" data-testid="brief-progress">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex-1">
          <button type="button" onClick={() => onJump(i)} disabled={i >= current} className="w-full text-left">
            <span className={`block h-1.5 rounded-full ${i <= current ? "bg-ui-bg-interactive" : "bg-ui-border-base"}`} />
            <Text className={`text-small-regular mt-1 ${i === current ? "text-ui-fg-base" : "text-ui-fg-muted"}`}>
              {i + 1}. {s.label}
            </Text>
          </button>
        </li>
      ))}
    </ol>
  )
}

function Panel({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section>
      <Heading level="h2" className="text-xl-semi">
        {title}
      </Heading>
      {lead && <Text className="text-ui-fg-subtle mt-1 mb-5 max-w-3xl">{lead}</Text>}
      {children}
    </section>
  )
}

function Nav({
  pending,
  back,
  next,
  nextLabel = "Next",
  nextDisabled = false,
  nextHint = null,
}: {
  pending: boolean
  back: () => void
  next: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextHint?: string | null
}) {
  return (
    <div className="mt-8 flex items-center justify-between border-t border-ui-border-base pt-5">
      <Button variant="transparent" onClick={back} disabled={pending} data-testid="brief-back">
        ← Back
      </Button>
      <div className="flex items-center gap-3">
        {nextHint && <Text className="text-small-regular text-ui-fg-muted">{nextHint}</Text>}
        <Button onClick={next} isLoading={pending} disabled={nextDisabled} data-testid="brief-next">
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}

function QuestionField({
  q,
  value,
  disabled,
  onChange,
  upload,
}: {
  q: BriefQuestion
  value: unknown
  disabled: boolean
  onChange: (v: unknown) => void
  upload: { token: string; countryCode: string; onUploaded: (b: BriefView) => void }
}) {
  if (q.kind === "file") {
    return <FileField q={q} files={(Array.isArray(value) ? value : []) as BriefFile[]} disabled={disabled} onChange={onChange} upload={upload} />
  }
  const id = `q-${q.key}`
  const input = "w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-base-regular disabled:opacity-70"
  const help = q.help ? <Text className="text-small-regular text-ui-fg-muted">{q.help}</Text> : null
  const star = q.required ? <span className="text-ui-fg-error"> *</span> : null

  if (q.kind === "multi_choice" || q.kind === "choice") {
    const current = q.kind === "multi_choice" ? (Array.isArray(value) ? (value as string[]) : []) : (value as string)
    return (
      <fieldset className="flex flex-col gap-1">
        <legend className="text-base-semi mb-1">
          {q.label}
          {star}
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
                aria-pressed={on}
                onClick={() => {
                  if (q.kind === "multi_choice") {
                    const list = current as string[]
                    onChange(on ? list.filter((x) => x !== opt) : [...list, opt])
                  } else onChange(on ? "" : opt)
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
      <label htmlFor={id} className="text-base-semi">
        {q.label}
        {star}
      </label>
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

/** Uploads go straight to the backend (via /api), one file at a time; removal is saved on Next. */
function FileField({
  q,
  files,
  disabled,
  onChange,
  upload,
}: {
  q: BriefQuestion
  files: BriefFile[]
  disabled: boolean
  onChange: (v: unknown) => void
  upload: { token: string; countryCode: string; onUploaded: (b: BriefView) => void }
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const send = async (list: FileList | null) => {
    if (!list?.length) return
    setErr(null)
    for (const file of Array.from(list)) {
      if (file.size > 10 * 1024 * 1024) {
        setErr(`${file.name} is over 10 MB.`)
        continue
      }
      setBusy(file.name)
      const fd = new FormData()
      fd.append("file", file)
      fd.append("question_key", q.key)
      fd.append("country", upload.countryCode)
      try {
        const res = await fetch(`/api/briefs/${encodeURIComponent(upload.token)}/files`, { method: "POST", body: fd })
        const json = await res.json()
        if (!res.ok || !json.brief) setErr(json.message || `Could not upload ${file.name}.`)
        else upload.onUploaded(json.brief as BriefView)
      } catch {
        setErr(`Could not upload ${file.name}.`)
      }
    }
    setBusy(null)
  }

  return (
    <div className="flex flex-col gap-1" data-testid="brief-file-field">
      <span className="text-base-semi">{q.label}</span>
      {q.help && <Text className="text-small-regular text-ui-fg-muted">{q.help}</Text>}
      <label
        className={`mt-1 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-ui-border-strong px-4 py-6 text-center ${
          disabled || busy ? "opacity-60" : "cursor-pointer hover:border-ui-border-interactive"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (!disabled && !busy) send(e.dataTransfer.files)
        }}
      >
        <input
          type="file"
          className="hidden"
          multiple
          accept="image/*,application/pdf"
          disabled={disabled || !!busy}
          onChange={(e) => {
            send(e.target.files)
            e.target.value = ""
          }}
          data-testid="brief-file-input"
        />
        <Text className="text-ui-fg-base">{busy ? `Uploading ${busy}…` : "Drop files here or click to choose"}</Text>
        <Text className="text-small-regular text-ui-fg-muted">Images or PDF, up to 10 MB each</Text>
      </label>
      {err && <Text className="text-small-regular text-ui-fg-error">{err}</Text>}
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2 mt-2" data-testid="brief-files">
          {files.map((f) => (
            <li key={f.url} className="flex items-center gap-2 rounded-md border border-ui-border-base p-2">
              {f.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt="" className="h-10 w-10 object-cover rounded" />
              ) : (
                <span className="h-10 w-10 flex items-center justify-center rounded bg-ui-bg-subtle text-small-semi">PDF</span>
              )}
              <a href={f.url} target="_blank" rel="noreferrer" className="text-small-regular underline max-w-[12rem] truncate">
                {f.name}
              </a>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  className="text-ui-fg-muted hover:text-ui-fg-error px-1"
                  onClick={() => onChange(files.filter((x) => x.url !== f.url))}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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
    <div className={`my-4 rounded-md border px-4 py-3 ${cls}`} data-testid={`brief-banner-${tone}`}>
      <Text className="text-ui-fg-base">{children}</Text>
    </div>
  )
}
