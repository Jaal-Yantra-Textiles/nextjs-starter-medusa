import { headers } from "next/headers"

import { getBaseURL } from "@lib/util/env"
import { IS_MULTI_TENANT } from "@lib/util/get-request-pubkey"

/**
 * Request-aware base URL for every absolute URL we emit for SEO — canonicals,
 * `metadataBase`, Open Graph, JSON-LD, sitemap and robots.
 *
 * Single-tenant (the per-partner Vercel projects): one deployment == one
 * domain, so the env-resolved value (`getBaseURL`) is correct, static and
 * cacheable. This path NEVER touches `headers()`, so single-tenant routes stay
 * statically rendered.
 *
 * Multi-tenant (the shared Worker serving many custom domains from ONE
 * deployment): every tenant shares the same `VERCEL_PROJECT_PRODUCTION_URL`, so
 * `getBaseURL()` emits the SAME host for all of them — the reason the sitemap
 * printed one domain for every store. Instead derive the base URL from the
 * incoming request Host (the exact signal the middleware uses to resolve the
 * tenant), so each domain gets domain-oriented URLs.
 *
 * Server-only (reads `next/headers`); import only from server components,
 * metadata files, and route handlers.
 */
export async function getRequestBaseURL(): Promise<string> {
  if (!IS_MULTI_TENANT) {
    return getBaseURL()
  }

  try {
    const h = await headers()
    // Match the middleware's tenant-resolution signal: `host` first, then the
    // forwarded header (first hop if a proxy chained several).
    const raw =
      h.get("host") || h.get("x-forwarded-host")?.split(",")[0].trim()

    if (raw) {
      const isLocal = /^(localhost|127\.0\.0\.1)/.test(raw)
      const proto = h.get("x-forwarded-proto") || (isLocal ? "http" : "https")
      // Keep the port only for local dev (http); public https hosts never carry one.
      const host = proto === "https" ? raw.replace(/:\d+$/, "") : raw
      return `${proto}://${host}`
    }
  } catch {
    // `headers()` unavailable (e.g. a fully static render) — fall back to env.
  }

  return getBaseURL()
}
