import { notFound, redirect } from "next/navigation"

import { getWebsite } from "@lib/data/website"
import { findPublishedPageSlug } from "@lib/util/website-pages"

/**
 * `/contact` — the path theme navigation and the order "Need help?" box link
 * to. The partner's Contact page lives at `/pages/<slug>` (seeded as
 * `contact-us`), so without this route every Contact link was a 404.
 */
export default async function ContactPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  let slug: string | null = null
  try {
    slug = findPublishedPageSlug(await getWebsite(), "Contact", [
      "contact-us",
      "contact",
    ])
  } catch {
    slug = null
  }

  if (!slug) {
    notFound()
  }
  redirect(`/${countryCode}/pages/${slug}`)
}
