
import { MetadataRoute } from "next"
import { getRequestBaseURL } from "@lib/util/base-url"

// No `dynamic` config export — Next requires a static literal there and rejects
// a `process.env` ternary at build. Instead, multi-tenant reads the request
// Host via getRequestBaseURL() (→ `headers()`), which makes this route render
// per-request so a tenant's robots isn't cached and served to another domain.
// Single-tenant never reads headers → stays statically cacheable.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getRequestBaseURL()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/checkout",
          "/*/checkout/*",
          "/*/cart",
          "/*/account",
          "/*/account/*",
          "/*/order/*",
          // #859 — private artisan product review links. Unpublished and
          // noindex'd, but this file is what advertises where they are, so
          // omitting the rule publishes the location of every unlisted preview.
          // The main storefront has had this since #859; this copy drifted and
          // every partner domain runs THIS one (shared `storefront-shared`
          // deployment), so the gap applied to all of them. See #1335.
          "/*/products/preview/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
