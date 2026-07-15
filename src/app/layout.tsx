import { getBaseURL } from "@lib/util/env"
import { getWebsite, type WebsiteAnalytics, type WebsiteTheme } from "@lib/data/website"
import { CustomAnalyticsInjector } from "@modules/website/components/custom-analytics-injector"
import { Metadata } from "next"
import "styles/globals.css"


// Default in-house tracker — same CDN-hosted bundle that apps/storefront
// uses. Override per-deployment with NEXT_PUBLIC_ANALYTICS_SCRIPT_URL if
// a partner needs to point at a different host.
const IN_HOUSE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL ||
  "https://automatic.jaalyantra.com/analytics.min.js"

const DEFAULT_DESCRIPTION =
  "Shop handmade, locally sourced, and ethically produced fashion."

export async function generateMetadata(): Promise<Metadata> {
  const envStoreName = process.env.NEXT_PUBLIC_STORE_NAME || "Store"
  let theme: WebsiteTheme | null = null
  try {
    const website = await getWebsite()
    theme = website.theme ?? null
  } catch {
    // backend unreachable — fall back to env-derived defaults
  }
  const storeName = theme?.branding?.store_name || envStoreName
  const description = theme?.branding?.tagline || DEFAULT_DESCRIPTION
  const faviconUrl = theme?.branding?.favicon_url

  return {
    metadataBase: new URL(getBaseURL()),
    title: {
      default: storeName,
      template: `%s | ${storeName}`,
    },
    description,
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
    openGraph: {
      type: "website",
      siteName: storeName,
    },
    twitter: {
      card: "summary_large_image",
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const baseUrl = getBaseURL()
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Store"

  // Fetch the website's analytics config so we know which script(s) to
  // inject. Failure is non-fatal — if the backend is down at build time
  // we render the page without analytics rather than 500 the whole app.
  let websiteId: string | undefined
  let analytics: WebsiteAnalytics | null = null
  try {
    const website = await getWebsite()
    websiteId = website.id
    analytics = website.analytics ?? null
  } catch {
    // backend unreachable — proceed without analytics
  }
  const provider = analytics?.provider ?? "in_house"

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeName,
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
  }

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: storeName,
    url: baseUrl,
  }

  return (
    <html lang="en" data-mode="light">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        {provider === "in_house" && websiteId && (
          <script
            src={IN_HOUSE_SCRIPT_URL}
            data-website-id={websiteId}
            defer
          />
        )}
      </head>
      <body>
        {provider === "custom" && analytics?.custom_head && (
          <CustomAnalyticsInjector
            html={analytics.custom_head}
            where="head"
            marker="custom-head"
          />
        )}
        {provider === "custom" && analytics?.custom_body_end && (
          <CustomAnalyticsInjector
            html={analytics.custom_body_end}
            where="body-end"
            marker="custom-body-end"
          />
        )}
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
