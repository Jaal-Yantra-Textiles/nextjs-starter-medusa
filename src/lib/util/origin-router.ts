/**
 * The Vercel side of the self-hosted origin (#2636).
 *
 * On Vercel, `proxy.ts` forwards page requests for chosen hosts to the
 * self-hosted origin instead of rendering them here, so the compute moves off
 * Vercel while the partner domains stay attached to it. Every other host is
 * served by this deployment exactly as before.
 *
 * Settings (Vercel project env; all three needed, else nothing is routed):
 *   ORIGIN_URL            https://sf-origin.jaalyantra.com
 *   ORIGIN_ROUTER_SECRET  the value the origin expects in ORIGIN_PROXY_SECRET
 *   ORIGIN_CANARY_HOSTS   comma list of hosts to route, or "*" for all
 *
 * The router's secret is a DIFFERENT env name from the origin's
 * ORIGIN_PROXY_SECRET on purpose: setting that one on Vercel would lock this
 * deployment and refuse its own buyers.
 */

import {
  BUYER_COUNTRY_HEADER,
  ORIGIN_PROXY_SECRET_HEADER,
} from "@lib/util/request-host"

/** `process.env`, or a plain object in tests. */
type RouterEnv = Record<string, string | undefined>

export type OriginRoute = {
  /** Absolute origin URL to forward to. */
  url: string
  /** Request headers to send upstream. */
  headers: Headers
}

/** Whether `host` (lowercase, no port) is routed by a canary list. */
export function isRoutedHost(host: string, list: string | undefined): boolean {
  if (!host || !list) return false
  const hosts = list
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  return hosts.includes("*") || hosts.includes(host)
}

/**
 * The upstream request for a routed host, or null when this request stays on
 * Vercel. Pure: env and request parts are passed in so it is testable.
 */
export function originRoute(input: {
  host: string
  pathname: string
  search: string
  requestHeaders: Headers
  country?: string
  env: RouterEnv
}): OriginRoute | null {
  const { ORIGIN_URL, ORIGIN_ROUTER_SECRET, ORIGIN_CANARY_HOSTS } = input.env
  if (!ORIGIN_URL || !ORIGIN_ROUTER_SECRET) return null
  if (!isRoutedHost(input.host, ORIGIN_CANARY_HOSTS)) return null

  const url = `${ORIGIN_URL.replace(/\/+$/, "")}${input.pathname}${input.search}`
  const headers = new Headers(input.requestHeaders)
  headers.set(ORIGIN_PROXY_SECRET_HEADER, ORIGIN_ROUTER_SECRET)
  headers.set("x-forwarded-host", input.host)
  headers.set("x-forwarded-proto", "https")
  if (input.country) headers.set(BUYER_COUNTRY_HEADER, input.country)
  else headers.delete(BUYER_COUNTRY_HEADER)
  return { url, headers }
}

/**
 * Forward a revalidate webhook to the origin too, so its data cache drops the
 * same tags/paths as this deployment's. Fire-and-forget: a slow or absent
 * origin must never fail the backend's webhook.
 */
export async function forwardRevalidate(
  body: unknown,
  revalidateSecret: string,
  env: RouterEnv = process.env
): Promise<number | null> {
  // Both origins: the standby must not serve stale pages after a failover.
  const targets = [env.ORIGIN_URL, env.ORIGIN_STANDBY_URL].filter(
    (u): u is string => !!u
  )
  if (!targets.length || !env.ORIGIN_ROUTER_SECRET) return null
  const statuses = await Promise.all(
    targets.map(async (base) => {
      try {
        const res = await fetch(`${base.replace(/\/+$/, "")}/api/revalidate`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-revalidate-secret": revalidateSecret,
            [ORIGIN_PROXY_SECRET_HEADER]: env.ORIGIN_ROUTER_SECRET as string,
          },
          body: JSON.stringify(body ?? {}),
          // The standby may be asleep: give it time to start.
          signal: AbortSignal.timeout(base === env.ORIGIN_URL ? 5000 : 15000),
        })
        return res.status
      } catch {
        return null
      }
    })
  )
  // The primary's status, as before (null if it failed).
  return statuses[0]
}

/**
 * Which origin is active right now (#2636 failover).
 *
 * The Vercel project's Global Config store ("storefront-origin", connection
 * string in env ORIGIN_GLOBAL_CONFIG) holds `origin_url`: the AWS primary
 * normally, the Cloudflare standby during a failover. Flipping that one item
 * moves every routed store in seconds, with no redeploy. Without the store,
 * or on any read error, the ORIGIN_URL env var decides, exactly as before.
 *
 * Cached per instance for a few seconds so the read is not per request.
 */
const ORIGIN_CACHE_MS = 5000
let originCache: { url: string | undefined; at: number } | null = null

export function pickOriginUrl(
  configured: unknown,
  fallback: string | undefined
): string | undefined {
  return typeof configured === "string" && /^https:\/\/[^\s/]+/.test(configured)
    ? configured
    : fallback
}

export async function activeOriginUrl(
  env: RouterEnv = process.env,
  read?: (key: string) => Promise<unknown>
): Promise<string | undefined> {
  const fallback = env.ORIGIN_URL
  const conn = env.ORIGIN_GLOBAL_CONFIG
  if (!conn && !read) return fallback
  const now = Date.now()
  if (originCache && now - originCache.at < ORIGIN_CACHE_MS) {
    return originCache.url ?? fallback
  }
  let url: string | undefined
  try {
    let value: unknown
    if (read) {
      value = await read("origin_url")
    } else {
      const { createClient } = await import("@vercel/global-config")
      // Call through the client: a detached `get` loses its `this`.
      value = await createClient(conn).get("origin_url")
    }
    url = pickOriginUrl(value, fallback)
  } catch {
    url = fallback
  }
  originCache = { url, at: now }
  return url
}

/** Test hook: forget the cached origin. */
export function resetOriginCache() {
  originCache = null
}
