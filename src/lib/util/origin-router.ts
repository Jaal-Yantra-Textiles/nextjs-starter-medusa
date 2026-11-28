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
type OriginConfig = { url: string | undefined; standbyPercent: number }
let originCache: (OriginConfig & { at: number }) | null = null

export function pickOriginUrl(
  configured: unknown,
  fallback: string | undefined
): string | undefined {
  return typeof configured === "string" && /^https:\/\/[^\s/]+/.test(configured)
    ? configured
    : fallback
}

/** A share of new visitors, 0-100; anything else is 0 (all on the primary). */
export function pickStandbyPercent(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value
  return typeof n === "number" && Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0
}

/**
 * `origin_url` (failover switch) and `standby_percent` (sticky traffic split)
 * from Global Config, cached a few seconds. Any read error → the env
 * ORIGIN_URL and no split, i.e. exactly the old single-origin behaviour.
 */
export async function activeOriginConfig(
  env: RouterEnv = process.env,
  read?: (key: string) => Promise<unknown>
): Promise<OriginConfig> {
  const fallback = env.ORIGIN_URL
  const conn = env.ORIGIN_GLOBAL_CONFIG
  if (!conn && !read) return { url: fallback, standbyPercent: 0 }
  const now = Date.now()
  if (originCache && now - originCache.at < ORIGIN_CACHE_MS) {
    return { url: originCache.url ?? fallback, standbyPercent: originCache.standbyPercent }
  }
  let cfg: OriginConfig = { url: fallback, standbyPercent: 0 }
  try {
    let urlValue: unknown
    let pctValue: unknown
    if (read) {
      urlValue = await read("origin_url")
      pctValue = await read("standby_percent")
    } else {
      const { createClient } = await import("@vercel/global-config")
      // Call through the client: a detached `getAll` loses its `this`.
      const all: any = await createClient(conn).getAll(["origin_url", "standby_percent"])
      urlValue = all?.origin_url
      pctValue = all?.standby_percent
    }
    cfg = { url: pickOriginUrl(urlValue, fallback), standbyPercent: pickStandbyPercent(pctValue) }
  } catch {
    cfg = { url: fallback, standbyPercent: 0 }
  }
  originCache = { ...cfg, at: now }
  return cfg
}

/** The active origin URL alone (failover switch only). */
export async function activeOriginUrl(
  env: RouterEnv = process.env,
  read?: (key: string) => Promise<unknown>
): Promise<string | undefined> {
  return (await activeOriginConfig(env, read)).url
}

/** Cookie that keeps a visitor on one origin: each has its own build. */
export const ORIGIN_COOKIE = "jyt_origin"
export const ORIGIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

/**
 * Which origin serves this visitor.
 *
 * - Failover (`origin_url` is the standby): everyone goes to the standby.
 * - No standby, or a 0% split: everyone goes to `origin_url`.
 * - Otherwise a STICKY split: a visitor keeps the origin in their cookie; a new
 *   visitor lands on the standby with probability `standbyPercent`. Sticky
 *   because the two origins are separate builds: mixing them mid-visit makes
 *   Next.js hard-reload on the build mismatch.
 *
 * Returns the URL and the cookie value to set (only when it changes).
 */
export function chooseOrigin(input: {
  originUrl?: string
  standbyUrl?: string
  standbyPercent: number
  cookie?: string | null
  rand?: () => number
}): { url?: string; bucket: "p" | "s"; setCookie?: "p" | "s" } {
  const { originUrl, standbyUrl, standbyPercent, cookie } = input
  const strip = (u?: string) => (u || "").replace(/\/+$/, "")
  if (standbyUrl && strip(originUrl) === strip(standbyUrl)) {
    return { url: standbyUrl, bucket: "s" }
  }
  if (!standbyUrl || standbyPercent <= 0) {
    return { url: originUrl, bucket: "p", ...(cookie === "s" ? { setCookie: "p" as const } : {}) }
  }
  if (cookie === "s") return { url: standbyUrl, bucket: "s" }
  if (cookie === "p") return { url: originUrl, bucket: "p" }
  const roll = (input.rand ?? Math.random)() * 100
  return roll < standbyPercent
    ? { url: standbyUrl, bucket: "s", setCookie: "s" }
    : { url: originUrl, bucket: "p", setCookie: "p" }
}

/** Test hook: forget the cached origin. */
export function resetOriginCache() {
  originCache = null
}
