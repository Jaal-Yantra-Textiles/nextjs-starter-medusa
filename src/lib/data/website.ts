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
    /** Any CSS length — "60vh", "480px". Defaults to 75vh when unset. */
    min_height?: string
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
    /**
     * #1364 — the full-width band BELOW the gallery. Distinct from
     * `description_layout`, which only ever chose a container for two hardcoded
     * panels inside the narrow sticky column. The theme decides the SHAPE
     * (which blocks, in what order, arranged how); each product supplies the
     * substance, and a block its product cannot fill is not rendered.
     */
    detail_band?: {
      enabled?: boolean
      heading?: string
      layout?: "grid-2" | "grid-3" | "rows" | "tabs" | "accordion"
      blocks?: Array<{
        source:
          | "spec"
          | "spec_fields"
          | "attributes"
          | "maker"
          | "care"
          | "shipping"
        label?: string
        /** Only read for the theme-authored sources (care, shipping). */
        body?: string
        enabled?: boolean
      }>
    }
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

// SEO verification tokens the backend serves per-Website (#349). Injected into
// <head> regardless of analytics provider (analytics.custom_head only renders
// for the "custom" provider, so it can't double as the SEO hook).
export type WebsiteSeo = {
  google_site_verification: string | null
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
  seo?: WebsiteSeo | null
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

/**
 * How long a cached website/theme response may stay stale, in seconds.
 *
 * The backend POSTs `/api/revalidate` after every partner edit, and that is
 * still the fast path — edits appear within a second or two. But that hop
 * depends on a shared secret being set correctly on BOTH sides, per project,
 * by hand: the backend sends `STOREFRONT_REVALIDATE_SECRET`, the storefront
 * checks `REVALIDATE_SECRET`. When those disagree the route answers 401/503,
 * the backend only warns to its own console, and the partner sees a green save
 * that changes nothing on their live site — for as long as the deployment
 * lives, because a tag-only `force-cache` entry has no expiry.
 *
 * A TTL makes that failure mode temporary instead of permanent: worst case the
 * partner waits this long, rather than until the next deploy. Tune per
 * deployment with WEBSITE_CACHE_TTL_SECONDS; set 0 to disable caching.
 */
const WEBSITE_CACHE_TTL_SECONDS = Number.parseInt(
  process.env.WEBSITE_CACHE_TTL_SECONDS ?? "300",
  10
)

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

  // Tags stay — the webhook's targeted `revalidateTag("website")` is still the
  // quickest way to pick up an edit. `revalidate` is the floor under it, not a
  // replacement for it.
  const next: Record<string, unknown> = {
    ...(await getCacheOptions("website")),
  }
  if (Number.isFinite(WEBSITE_CACHE_TTL_SECONDS) && WEBSITE_CACHE_TTL_SECONDS > 0) {
    next.revalidate = WEBSITE_CACHE_TTL_SECONDS
  }

  return sdk.client.fetch<PublicWebsite>(`/web/website/${resolvedDomain}`, {
    next,
    // `no-store` when the TTL is disabled: force-cache with no expiry and no
    // working webhook is the exact trap this guards against.
    cache: WEBSITE_CACHE_TTL_SECONDS > 0 ? "force-cache" : "no-store",
  })
}

export type UnsubscribeInfo = { found: boolean; email: string | null }

export type UnsubscribeResult = {
  message: string
  email: string | null
  unsubscribed: number
  already_off?: boolean
}

// GET /web/website/:domain/unsubscribe — non-mutating; resolves the (masked)
// target email so the confirm page can echo which address is being removed.
export async function getUnsubscribeInfo(
  params: { id?: string; email?: string },
  domain?: string
): Promise<UnsubscribeInfo> {
  const resolvedDomain = domain || (await getStorefrontDomain())
  const qs = new URLSearchParams()
  if (params.id) qs.set("id", params.id)
  if (params.email) qs.set("email", params.email)
  return sdk.client.fetch<UnsubscribeInfo>(
    `/web/website/${resolvedDomain}/unsubscribe?${qs.toString()}`,
    { cache: "no-store" }
  )
}

// POST /web/website/:domain/unsubscribe — performs the opt-out. Idempotent.
// NOTE: sdk.client.fetch auto-stringifies the body — pass the object, never
// JSON.stringify (double-encoding trips the backend's strict parser).
export async function unsubscribeSubscriber(
  params: { id?: string; email?: string },
  domain?: string
): Promise<UnsubscribeResult> {
  const resolvedDomain = domain || (await getStorefrontDomain())
  return sdk.client.fetch<UnsubscribeResult>(
    `/web/website/${resolvedDomain}/unsubscribe`,
    {
      method: "POST",
      body: { id: params.id, email: params.email },
      cache: "no-store",
    }
  )
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
