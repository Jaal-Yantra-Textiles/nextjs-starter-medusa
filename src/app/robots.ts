
import { MetadataRoute } from "next"
import { getRequestBaseURL } from "@lib/util/base-url"

// Same rationale as sitemap.ts: per-tenant Host must not be cached across
// domains in multi-tenant mode. Single-tenant stays statically cacheable.
export const dynamic =
  process.env.NEXT_PUBLIC_MULTI_TENANT === "true" ? "force-dynamic" : "auto"

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
