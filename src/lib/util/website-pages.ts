import type { PublicWebsite } from "@lib/data/website"

/**
 * The slug of the website's published page of a given kind, or null.
 *
 * Theme navigation links to fixed paths — `/about`, `/contact` — while the
 * pages themselves live at `/pages/<slug>` under whatever slug the partner
 * chose (the default Contact page is `contact-us`). Matching on `page_type`
 * first lets those fixed links find the page whatever it is called; the slug
 * list is the fallback for a page saved as "Custom".
 */
export function findPublishedPageSlug(
  website: PublicWebsite | null | undefined,
  pageType: string,
  fallbackSlugs: string[] = []
): string | null {
  const published = (website?.pages ?? []).filter(
    (p) => p.status === "Published" && p.slug
  )
  const byType = published.find(
    (p) => String(p.page_type).toLowerCase() === pageType.toLowerCase()
  )
  if (byType) return byType.slug
  const bySlug = published.find((p) => fallbackSlugs.includes(p.slug))
  return bySlug?.slug ?? null
}
