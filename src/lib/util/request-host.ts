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
 * several), then `host`. Served directly by Vercel today both headers carry
 * the same domain, so this changes nothing there.
 *
 * Pure (no `next/headers`): the edge middleware and route handlers pass
 * `request.headers`; server components pass `await headers()`.
 */

type HeaderReader = { get(name: string): string | null }

/** The public host, lowercased, port kept (local dev uses one). "" if none. */
export function requestHost(h: HeaderReader): string {
  const forwarded = h.get("x-forwarded-host")?.split(",")[0].trim()
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
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0].trim() ||
    (isLocal ? "http" : "https")
  const publicHost = proto === "https" ? host.replace(/:\d+$/, "") : host
  return `${proto}://${publicHost}`
}
