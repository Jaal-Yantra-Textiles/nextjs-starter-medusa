"use server"

import { headers } from "next/headers"
import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type AnimationType =
  | "none"
  | "fade-up"
  | "fade-in"
  | "fade-down"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "zoom-out"

export type WebsiteTheme = {
  branding?: {
    logo_url?: string
    store_name?: string
    favicon_url?: string
    tagline?: string
  }
  colors?: {
    primary?: string
    secondary?: string
    background?: string
    text?: string
    accent?: string
    muted?: string
    border?: string
  }
  typography?: {
    font_family?: string
    heading_font_family?: string
    base_font_size?: string
    heading_weight?: string
  }
  buttons?: {
    border_radius?: string
    primary_style?: "filled" | "outline"
  }
  animations?: {
    enabled?: boolean
    global_duration?: "fast" | "normal" | "slow"
    hero_entrance?: AnimationType
    section_entrance?: "none" | "fade-up" | "stagger"
    stagger_delay?: number
  }
  hero?: {
    layout?: "center" | "left" | "right" | "split"
    animation?: AnimationType
    bg_animation?: "none" | "ken-burns" | "zoom-in" | "fade-in" | "pan-left" | "pan-right"
    badge_text?: string
    title?: string
    subtitle?: string
    description?: string
    background_image_url?: string
    overlay_opacity?: number
    cta_text?: string
    cta_link?: string
    secondary_cta_text?: string
    secondary_cta_link?: string
    features?: Array<{ icon?: string; title: string; description?: string }>
  }
  navigation?: {
    links?: Array<{ label: string; href: string }>
    show_account_link?: boolean
    show_cart_icon?: boolean
    show_search?: boolean
    sticky?: boolean
    style?: "transparent" | "solid" | "bordered"
  }
  footer?: {
    text?: string
    copyright_text?: string
    social_links?: Array<{ platform: string; url: string }>
    show_newsletter?: boolean
    newsletter_heading?: string
    newsletter_description?: string
  }
  home_sections?: {
    show_featured_collections?: boolean
    featured_collection_count?: number
    products_per_collection?: number
    collection_heading?: string
    empty_state_product_name?: string
    show_categories?: boolean
    category_heading?: string
    sections_order?: Array<
      | "hero"
      | "trust_banner"
      | "collections"
      | "text_with_image"
      | "categories"
      | "testimonials"
      | "banner"
      | "newsletter"
    >
    trust_banner?: {
      items?: Array<{ icon?: string; text: string }>
      background?: string
      // Optional explicit text colour (hex). When omitted, the
      // renderer auto-picks light/dark text based on `background`
      // luminance so a dark bg doesn't render unreadable dark text.
      text_color?: string
    }
    text_with_image?: {
      title?: string
      description?: string
      image_url?: string
      cta_text?: string
      cta_link?: string
      layout?: "image-left" | "image-right"
    }
    testimonials?: {
      heading?: string
      items?: Array<{ quote: string; author: string; role?: string; avatar_url?: string }>
    }
    banner?: {
      title?: string
      description?: string
      background_image_url?: string
      background_color?: string
      // Optional explicit text colour (hex). When omitted, the
      // renderer auto-picks light/dark text based on
      // `background_color` luminance.
      text_color?: string
      cta_text?: string
      cta_link?: string
    }
    newsletter?: {
      heading?: string
      description?: string
      placeholder?: string
      button_text?: string
    }
  }
  product_page?: {
    show_related_products?: boolean
    related_heading?: string
    show_tabs?: boolean
    show_breadcrumbs?: boolean
    show_sku?: boolean
    show_stock_status?: boolean
    image_layout?: "gallery" | "single" | "grid"
    gallery_position?: "left" | "right"
    description_layout?: "tabs" | "accordion" | "stacked"
    cta_text?: string
    sample_product_name?: string
    sample_product_price?: string
  }
  cart?: {
    heading?: string
    empty_message?: string
    empty_cta_text?: string
    empty_cta_link?: string
    show_sign_in_prompt?: boolean
    checkout_button_text?: string
    show_order_summary?: boolean
    show_free_shipping_bar?: boolean
    free_shipping_threshold?: string
  }
}

export type AnalyticsProvider = "in_house" | "custom" | "off"

export type WebsiteAnalytics = {
  provider: AnalyticsProvider
  custom_head: string | null
  custom_body_end: string | null
}

export type PublicWebsite = {
  // Backend-issued website id, stamped on outbound analytics events
  // (the in-house tracker uses this as `data-website-id`).
  id?: string
  name: string
  domain: string
  theme?: WebsiteTheme | null
  favicon_url?: string | null
  analytics?: WebsiteAnalytics | null
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
  domain?: string,
  opts?: { noCache?: boolean }
): Promise<PublicWebsite> {
  const resolvedDomain = domain || (await getStorefrontDomain())

  if (opts?.noCache) {
    return sdk.client.fetch<PublicWebsite>(`/web/website/${resolvedDomain}`, {
      cache: "no-store",
    })
  }

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
