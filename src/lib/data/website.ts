"use server"

import { headers } from "next/headers"
import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type PublicWebsite = {
  name: string
  domain: string
  pages: Array<PublicWebsitePage>
}

export type PublicWebsitePage = {
  title: string
  slug: string
  page_type: string
  status: "Published" | "Draft" | "Archived"
  published_at?: string
  blocks?: Array<{
    id?: string
    name: string
    type: string
    content?: Record<string, unknown>
    settings?: Record<string, unknown>
    status?: string
    order: number
  }>
}

/**
 * Resolves the website domain from the current request's Host header.
 * No env var needed — each partner storefront auto-identifies itself.
 * Falls back to localhost for dev.
 */
export async function getStorefrontDomain(): Promise<string> {
  const hdrs = await headers()
  const host = hdrs.get("host") || hdrs.get("x-forwarded-host") || "localhost:8000"
  // Strip port for local dev
  return host.replace(/:\d+$/, "")
}

// GET /web/website/:domain
export async function getWebsite(
  domain?: string
): Promise<PublicWebsite> {
  const resolvedDomain = domain || (await getStorefrontDomain())
  const next = { ...(await getCacheOptions("website")) }
  return sdk.client.fetch<PublicWebsite>(`/web/website/${resolvedDomain}`, {
    next,
    cache: "force-cache",
  })
}

// GET /web/website/:domain/:page
export async function getWebsitePage(
  domain: string | undefined,
  slug: string
): Promise<PublicWebsitePage> {
  const resolvedDomain = domain || (await getStorefrontDomain())
  const next = { ...(await getCacheOptions("website_page")) }
  return sdk.client.fetch<PublicWebsitePage>(
    `/web/website/${resolvedDomain}/${slug}`,
    {
      next,
      cache: "force-cache",
    }
  )
}
