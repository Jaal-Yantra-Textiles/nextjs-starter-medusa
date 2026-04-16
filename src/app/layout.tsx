import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: process.env.NEXT_PUBLIC_STORE_NAME || "Store",
    template: `%s | ${process.env.NEXT_PUBLIC_STORE_NAME || "Store"}`,
  },
  description: "Shop handmade, locally sourced, and ethically produced fashion.",
  openGraph: {
    type: "website",
    siteName: process.env.NEXT_PUBLIC_STORE_NAME || "Store",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  const baseUrl = getBaseURL()
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Store"

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
      </head>
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
