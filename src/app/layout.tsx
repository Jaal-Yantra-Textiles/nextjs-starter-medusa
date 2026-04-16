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
  return (
    <html lang="en" data-mode="light">
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
