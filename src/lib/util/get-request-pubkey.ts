import { cookies as nextCookies, headers as nextHeaders } from "next/headers"

/**
 * Multi-tenant publishable-key resolution (server side).
 *
 * Single-tenant deploys (the per-partner Vercel storefronts) bake their
 * publishable key into `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` at build time — the
 * Medusa SDK sends it on every request and nothing here runs.
 *
 * The shared multi-tenant Worker ("Basic" tier) ships WITHOUT that env var. The
 * edge middleware resolves the incoming `Host` → the tenant's publishable key
 * and (a) injects it as the `x-medusa-pubkey` request header the RSC/server
 * actions read here, and (b) also drops it in a non-httpOnly `_medusa_pk`
 * cookie as a fallback + for the one client component that talks to the Store
 * API directly.
 */

export const TENANT_PUBKEY_HEADER = "x-medusa-pubkey"
export const TENANT_PUBKEY_COOKIE = "_medusa_pk"

/** Build-time key (present only on single-tenant deploys). */
export const ENV_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || undefined

/**
 * Multi-tenant is an EXPLICIT opt-in (the shared Worker sets it), not inferred
 * from a missing key. Inferring it would turn an accidental key loss on a
 * single-tenant deploy into a silent "404 everything" instead of a loud
 * build-time env error.
 */
export const IS_MULTI_TENANT =
  process.env.NEXT_PUBLIC_MULTI_TENANT === "true"

/**
 * The publishable key for the current server request. Env key when present
 * (single-tenant), else the middleware-injected header, else the cookie
 * fallback. Returns undefined only if resolution failed entirely.
 */
export async function getRequestPublishableKey(): Promise<string | undefined> {
  if (!IS_MULTI_TENANT) {
    return ENV_PUBLISHABLE_KEY
  }

  try {
    const h = await nextHeaders()
    const fromHeader = h.get(TENANT_PUBKEY_HEADER)
    if (fromHeader) {
      return fromHeader
    }
  } catch {
    // headers() unavailable in this context — fall through to cookie.
  }

  try {
    const c = await nextCookies()
    const fromCookie = c.get(TENANT_PUBKEY_COOKIE)?.value
    if (fromCookie) {
      return fromCookie
    }
  } catch {
    // cookies() unavailable — give up.
  }

  return undefined
}
