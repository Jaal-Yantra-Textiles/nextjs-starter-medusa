
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
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
