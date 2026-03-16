"use server"

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

const DEFAULT_DOMAIN =
  process.env.NEXT_PUBLIC_WEBSITE_DOMAIN || "shop.cicilabel.com"

// GET /web/website/:domain
export async function getWebsite(
  domain: string = DEFAULT_DOMAIN
): Promise<PublicWebsite> {
  const next = { ...(await getCacheOptions("website")) }
  return sdk.client.fetch<PublicWebsite>(`/web/website/${domain}`, {
    next,
    cache: "force-cache",
  })
}

// GET /web/website/:domain/:page
export async function getWebsitePage(
  domain: string,
  slug: string
): Promise<PublicWebsitePage> {
  const next = { ...(await getCacheOptions("website_page")) }
  return sdk.client.fetch<PublicWebsitePage>(`/web/website/${domain}/${slug}`, {
    next,
    cache: "force-cache",
  })
}
