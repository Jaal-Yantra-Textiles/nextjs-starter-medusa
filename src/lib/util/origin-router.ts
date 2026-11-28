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
  if (!env.ORIGIN_URL || !env.ORIGIN_ROUTER_SECRET) return null
  try {
    const res = await fetch(`${env.ORIGIN_URL.replace(/\/+$/, "")}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": revalidateSecret,
        [ORIGIN_PROXY_SECRET_HEADER]: env.ORIGIN_ROUTER_SECRET,
      },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(5000),
    })
    return res.status
  } catch {
    return null
  }
}
