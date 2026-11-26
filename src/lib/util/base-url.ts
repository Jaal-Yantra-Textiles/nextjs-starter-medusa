import { headers } from "next/headers"

import { getBaseURL } from "@lib/util/env"
import { IS_MULTI_TENANT } from "@lib/util/get-request-pubkey"
import { requestHost, requestOrigin } from "@lib/util/request-host"

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
    // Same signal the middleware resolves the tenant from: the forwarded
    // (buyer's) host first, then `host` (#2636).
    if (requestHost(h)) {
      return requestOrigin(h)
    }
  } catch {
    // `headers()` unavailable (e.g. a fully static render) — fall back to env.
  }

  return getBaseURL()
}
