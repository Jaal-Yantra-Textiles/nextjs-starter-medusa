/**
 * Theme-colour helpers used by sections that accept a partner-set
 * background colour (trust banner, banner, etc.).
 *
 * Without these, a dark `background_color` ends up rendering with the
 * default dark text — invisible. Partners shouldn't have to set a
 * matching text colour manually; the default should auto-flip based
 * on bg luminance.
 *
 * Partners can still override the choice explicitly via a `text_color`
 * field on the same section.
 */

/**
 * Parse a `#rrggbb` hex into 0-255 channels. Returns null for invalid
 * input (anything other than a 6-char hex with a leading #).
 */
function parseHex(hex: string | undefined | null): { r: number; g: number; b: number } | null {
  if (typeof hex !== "string") return null
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

/**
 * WCAG relative luminance of a hex colour. 0 = black, 1 = white.
 * Used to decide whether a bg is dark enough to need light text.
 */
export function luminance(hex: string | undefined | null): number {
  const rgb = parseHex(hex)
  if (!rgb) return 1 // unknown → treat as light → keep default text
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b)
}

/**
 * `true` when the supplied hex bg is dark enough that the default
 * dark-on-light text would be unreadable. Threshold is 0.5 (anything
 * darker than mid-grey).
 */
export function isDarkColor(hex: string | undefined | null): boolean {
  if (!hex) return false
  return luminance(hex) < 0.5
}

/**
 * Pick a text colour for a section with a partner-set background.
 *
 * - If `override` is a hex colour, return it as an inline style.
 * - Otherwise auto-flip to white on dark, default on light. Returns a
 *   Tailwind className for the auto path so it respects the rest of
 *   the site's typography tokens.
 *
 * Caller decides whether to apply `style.color` or `className` — both
 * are returned. Use the one that fits.
 */
export function pickTextColor(
  bg: string | undefined | null,
  override?: string | null
): { className: string; style?: { color: string } } {
  if (typeof override === "string" && override.trim()) {
    return { className: "", style: { color: override } }
  }
  if (isDarkColor(bg)) {
    return { className: "text-white" }
  }
  return { className: "text-ui-fg-base" }
}

/**
 * Same as pickTextColor but returns a slightly-faded variant — for
 * subtitles / supporting copy that should sit one tone below the
 * primary text on the same background.
 */
export function pickSubtitleColor(
  bg: string | undefined | null,
  override?: string | null
): { className: string; style?: { color: string } } {
  if (typeof override === "string" && override.trim()) {
    return { className: "", style: { color: override } }
  }
  if (isDarkColor(bg)) {
    return { className: "text-white/80" }
  }
  return { className: "text-ui-fg-subtle" }
}
