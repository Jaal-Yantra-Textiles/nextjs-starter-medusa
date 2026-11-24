"use server"

import { sdk } from "@lib/config"

/**
 * A quote brief (#2608): options, the workshops per step, live ESTIMATES and
 * the buyer's questions. Every figure is an estimate; the backend decides
 * which steps are estimated, "we'll confirm" (ask) or "exploring partners".
 */
export type BriefChoiceEstimate = {
  low: number
  high: number
  currency_code: string
  unit: string
  qty_per_piece: number
  setup_fee: number | null
  lead_days: number | null
  rate_confirmed: boolean
  stale: boolean
}

/** Public profile facts (#2444); empty unless the workshop made its profile public. */
export type BriefWorkshop = {
  id: string
  name: string
  handle: string | null
  /** Their page on our main storefront. */
  profile_url: string | null
  /** Their own shop, when they have one. */
  store_url: string | null
  tagline?: string | null
  about?: string | null
  cover_image?: string | null
  logo?: string | null
  team_size?: number | null
  roles: { role: string; count: number }[]
  pieces_made?: number
  making_since?: string | null
  photos: string[]
}

export type BriefChoice = {
  id: string
  partner: BriefWorkshop
  note: string | null
  estimate: BriefChoiceEstimate | null
  samples: { id: string; title: string; material: string | null; photos: string[] }[]
}

export type BriefStep = {
  id: string
  label: string
  kind: "fabric" | "process"
  technique: string | null
  technique_label: string | null
  qty_per_piece: number | null
  lead_days: number | null
  note: string | null
  selected_choice_id: string | null
  state: "estimated" | "ask" | "exploring"
  choices: BriefChoice[]
}

export type BriefOptionEstimate = {
  currency_code: string
  per_piece_low: number
  per_piece_high: number
  setup_total: number
  total_low: number | null
  total_high: number | null
  quantity: number | null
  pending_steps: string[]
  complete: boolean
  has_unconfirmed: boolean
  skipped_currency: string[]
}

export type BriefOptionStory = {
  /** Written by us for this style; may be null. */
  headline: string | null
  /** One factual line per craft step, and who makes it. */
  points: { label: string; text: string; by: string[] | null }[]
}

export type BriefOption = {
  id: string
  title: string
  description: string | null
  buyer_selected: boolean
  steps: BriefStep[]
  estimate: BriefOptionEstimate
  story: BriefOptionStory
  timeline: BriefTimeline
}

export type BriefTimeline = {
  sample_days: number | null
  production_low: number | null
  production_high: number | null
  unknown_steps: string[]
  ready_low: string | null
  ready_high: string | null
  deadline: string | null
  verdict: "on_track" | "tight" | "too_soon" | "unknown" | null
}

export type BriefFile = { url: string; name: string; type: string; size: number; uploaded_at: string }

export type BriefFx = {
  base_currency: string
  display_currency: string
  rate: number | null
  converted: boolean
  reason: string | null
}

export type BriefQuestion = {
  id: string
  key: string
  label: string
  help: string | null
  kind: "text" | "long_text" | "number" | "choice" | "multi_choice" | "date" | "boolean" | "link" | "file"
  options: string[] | null
  required: boolean
  answer: unknown
}

export type BriefUpdate = {
  id: string
  kind: "note" | "sample" | "price"
  message: string
  media_urls: string[]
  created_at: string
}

export type BriefView = {
  id: string
  title: string
  intro: string | null
  status: "draft" | "open" | "submitted" | "sampling" | "quoted" | "closed"
  lead: { id: string; name: string | null }
  recipient_name: string | null
  recipient_company: string | null
  destination_country_code: string
  currency_code: string
  fx: BriefFx
  sample_quantity: number | null
  sample_days: number | null
  submitted_at: string | null
  expires_at: string | null
  estimate_disclaimer: string
  options: BriefOption[]
  questions: BriefQuestion[]
  updates: BriefUpdate[]
  link_state: "live" | "expired" | "closed"
  editable: boolean
}

/** `country` is the page's /<country>/ segment: it picks the estimate currency. */
export const retrieveBrief = async (token: string, country: string): Promise<BriefView | null> => {
  try {
    const { brief } = await sdk.client.fetch<{ brief: BriefView }>(
      `/store/b2b/briefs/${encodeURIComponent(token)}`,
      { method: "GET", query: { country }, cache: "no-store" }
    )
    return brief ?? null
  } catch (e: any) {
    // The token length only — never the token, which is the credential.
    console.error(
      `[briefs] retrieveBrief failed: token_len=${token?.length ?? 0} status=${e?.status ?? "n/a"} message=${e?.message ?? String(e)}`
    )
    return null
  }
}

export type SaveBriefInput = {
  answers?: Record<string, unknown>
  selected_option_ids?: string[]
  step_choices?: Record<string, string | null>
  submit?: boolean
}

export const saveBrief = async (
  token: string,
  country: string,
  input: SaveBriefInput
): Promise<{ brief: BriefView | null; error: string | null }> => {
  try {
    const { brief } = await sdk.client.fetch<{ brief: BriefView }>(
      `/store/b2b/briefs/${encodeURIComponent(token)}`,
      { method: "POST", body: input, query: { country }, cache: "no-store" }
    )
    return { brief, error: null }
  } catch (e: any) {
    return { brief: null, error: e?.message || "Could not save. Please try again." }
  }
}
