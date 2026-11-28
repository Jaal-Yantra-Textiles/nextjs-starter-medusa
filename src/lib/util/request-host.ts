/**
 * The host the BUYER typed, not the host this server was reached on (#2636).
 *
 * The storefront runs behind a proxy: Vercel holds the custom domains
 * (cicilabel.com, gof.asia, …) and rewrites to our self-hosted upstream. On
 * that hop `host` is the upstream's name, and the buyer's domain arrives in
 * `x-forwarded-host`. Reading `host` first resolved every request to the
 * upstream: the wrong tenant (or none, a 404), and redirects (country code,
 * PayU return, cart adoption) that sent the buyer to the upstream's address.
 *
 * So prefer `x-forwarded-host` (its first value when proxies chained
 * several), then `host`, but only from a trusted proxy: see
 * `fromTrustedProxy`. Served directly by Vercel today both headers carry the
 * same domain and no secret is configured, so this changes nothing there.
 *
 * Pure (no `next/headers`): the edge middleware and route handlers pass
 * `request.headers`; server components pass `await headers()`.
 */

type HeaderReader = { get(name: string): string | null }

/**
 * Header our Vercel router adds to every request it forwards to the
 * self-hosted origin. Its value is `ORIGIN_PROXY_SECRET`.
 */
export const ORIGIN_PROXY_SECRET_HEADER = "x-origin-proxy-secret"

/** Header our Vercel router uses to pass the buyer's geo-IP country. */
export const BUYER_COUNTRY_HEADER = "x-buyer-country"

/** True when the origin is configured to accept only proxied traffic. */
export function originLocked(): boolean {
  return !!process.env.ORIGIN_PROXY_SECRET
}

/** Constant-time string compare, so the secret can't be guessed by timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Whether the forwarded headers (`x-forwarded-host`, `x-forwarded-proto`,
 * the buyer country) can be believed.
 *
 * - `ORIGIN_PROXY_SECRET` unset (served by Vercel directly, as today): yes.
 *   Vercel overwrites `x-forwarded-host` itself, so a client cannot fake it.
 * - Set (self-hosted origin): only when the request carries the matching
 *   secret header, i.e. it came through our router. Anyone hitting the
 *   origin's own address can send any `x-forwarded-host` they like, and that
 *   value decides the tenant and every redirect (PayU return, country code).
 */
export function fromTrustedProxy(h: HeaderReader): boolean {
  const secret = process.env.ORIGIN_PROXY_SECRET
  if (!secret) return true
  return safeEqual(h.get(ORIGIN_PROXY_SECRET_HEADER) || "", secret)
}

/**
 * The buyer's geo-IP country as passed by our router (lowercase ISO-2), or
 * undefined. Only read when the request came through the router: Vercel's
 * own `x-vercel-ip-country` is not guaranteed to survive an external rewrite.
 */
export function buyerCountry(h: HeaderReader): string | undefined {
  if (!originLocked() || !fromTrustedProxy(h)) return undefined
  const c = h.get(BUYER_COUNTRY_HEADER)?.trim().toLowerCase()
  return c && /^[a-z]{2}$/.test(c) ? c : undefined
}

/** The public host, lowercased, port kept (local dev uses one). "" if none. */
export function requestHost(h: HeaderReader): string {
  const forwarded = fromTrustedProxy(h)
    ? h.get("x-forwarded-host")?.split(",")[0].trim()
    : undefined
  return (forwarded || h.get("host") || "").trim().toLowerCase()
}

/**
 * The public origin (`https://cicilabel.com`). Protocol from
 * `x-forwarded-proto`, else http for localhost and https for everything else.
 * Public https hosts drop any port. Falls back to `fallback` (e.g.
 * `request.url`) when the request carries no host at all.
 */
export function requestOrigin(h: HeaderReader, fallback?: string): string {
  const host = requestHost(h)
  if (!host) {
    return fallback ? new URL(fallback).origin : ""
  }
  const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/.test(host)
  const forwardedProto = fromTrustedProxy(h)
    ? h.get("x-forwarded-proto")?.split(",")[0].trim()
    : undefined
  const proto = forwardedProto || (isLocal ? "http" : "https")
  const publicHost = proto === "https" ? host.replace(/:\d+$/, "") : host
  return `${proto}://${publicHost}`
}
