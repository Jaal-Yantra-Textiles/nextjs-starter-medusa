/**
 * #1364 — which detail blocks a given product actually renders, and how.
 *
 * A byte-for-byte port of the backend's
 * `api/partners/storefront/website/theme/resolve-detail-band.ts`, kept in sync
 * by hand for the same reason `getProductSpec` was (#1360): the two apps share
 * no code, and the rule has to run in both — once in the tests that can be run
 * without booting Next, and once here where the page is built. If you change
 * one, change the other.
 *
 * The rule that earns a function at all is about emptiness. The theme lists
 * blocks for EVERY product, so a product with no spec, no maker and no fields
 * would render three headings over three blanks — advertising detail nobody
 * provided, which is worse than the empty band we started with.
 */

export type DetailBlockSource =
  | "spec"
  | "spec_fields"
  | "attributes"
  | "maker"
  | "care"
  | "shipping"

export type DetailBandLayout =
  | "grid-2"
  | "grid-3"
  | "rows"
  | "tabs"
  | "accordion"

export type DetailBand = {
  enabled?: boolean
  heading?: string
  layout?: DetailBandLayout
  blocks?: Array<{
    source: DetailBlockSource
    label?: string
    body?: string
    enabled?: boolean
  }>
}

export type BlockAvailability = Partial<Record<DetailBlockSource, boolean>>

export type ResolvedDetailBlock = {
  source: DetailBlockSource
  label: string
  body?: string
}

export type ResolvedDetailBand = {
  layout: DetailBandLayout
  heading?: string
  blocks: ResolvedDetailBlock[]
}

export const DEFAULT_BLOCK_LABELS: Record<DetailBlockSource, string> = {
  spec: "Made to",
  spec_fields: "Details",
  attributes: "Product information",
  maker: "Made by",
  care: "Care",
  shipping: "Shipping & returns",
}

/** Sources whose content is written in the THEME, not read off the product. */
const THEME_AUTHORED: DetailBlockSource[] = ["care", "shipping"]

export const resolveDetailBand = (
  band: DetailBand | null | undefined,
  available: BlockAvailability
): ResolvedDetailBand | null => {
  // Absent is off. The band is new, so every theme that predates it has no
  // `detail_band` key at all, and those pages must look exactly as they did.
  if (!band || band.enabled !== true) {
    return null
  }

  const blocks: ResolvedDetailBlock[] = []

  for (const block of band.blocks || []) {
    if (block.enabled === false) {
      continue
    }

    const source = block.source
    const label = (block.label || "").trim() || DEFAULT_BLOCK_LABELS[source]

    if (THEME_AUTHORED.includes(source)) {
      const body = (block.body || "").trim()
      if (!body) {
        continue
      }
      blocks.push({ source, label, body })
      continue
    }

    if (!available[source]) {
      continue
    }
    blocks.push({ source, label })
  }

  if (!blocks.length) {
    return null
  }

  return {
    layout: band.layout || "rows",
    ...(band.heading?.trim() ? { heading: band.heading.trim() } : {}),
    blocks,
  }
}
