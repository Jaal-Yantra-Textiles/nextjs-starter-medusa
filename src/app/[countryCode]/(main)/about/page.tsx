import { Metadata } from "next"
import { redirect } from "next/navigation"

import { STORE_NAME } from "@lib/constants"
import { getWebsite, PublicWebsite } from "@lib/data/website"
import { findPublishedPageSlug } from "@lib/util/website-pages"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * `/about` — linked from theme navigation and from the home page's
 * "Read our story" / "Meet the artisans" buttons.
 *
 * A partner who has published their own About page is sent to it. Otherwise
 * this renders one from what the partner has ALREADY written for their home
 * page (the story section and the banner) — their words, not ours — so the
 * link never lands on a 404.
 */

const loadWebsite = async (): Promise<PublicWebsite | null> => {
  try {
    return await getWebsite()
  } catch {
    return null
  }
}

// The root layout's title template already appends the store name.
export const metadata: Metadata = { title: "About" }

export default async function AboutPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const website = await loadWebsite()

  const slug = findPublishedPageSlug(website, "About", ["about", "about-us"])
  if (slug) {
    redirect(`/${countryCode}/pages/${slug}`)
  }

  const theme = website?.theme
  const storeName = theme?.branding?.store_name || website?.name || STORE_NAME
  const story = theme?.home_sections?.text_with_image
  const banner = theme?.home_sections?.banner
  const hasContact = !!findPublishedPageSlug(website, "Contact", [
    "contact-us",
    "contact",
  ])

  return (
    <div className="content-container py-12 small:py-16" data-testid="about-page">
      <header className="mx-auto max-w-2xl text-center mb-10 small:mb-14">
        <h1 className="text-2xl small:text-4xl font-semibold tracking-tight mb-3">
          About {storeName}
        </h1>
        {banner?.title && (
          <p className="text-ui-fg-subtle text-sm small:text-base">{banner.title}</p>
        )}
      </header>

      {(story?.description || story?.image_url) && (
        <section className="grid gap-8 small:grid-cols-2 small:items-center mb-12">
          {story?.image_url && (
            <img
              src={story.image_url}
              alt={story.title || storeName}
              className="w-full rounded-lg object-cover aspect-[4/3]"
            />
          )}
          <div>
            {story?.title && (
              <h2 className="text-xl small:text-2xl font-semibold mb-3">{story.title}</h2>
            )}
            {story?.description && (
              <p className="text-ui-fg-subtle leading-relaxed">{story.description}</p>
            )}
          </div>
        </section>
      )}

      {banner?.description && (
        <section className="mx-auto max-w-2xl text-center mb-12">
          <p className="text-ui-fg-subtle leading-relaxed">{banner.description}</p>
        </section>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        <LocalizedClientLink
          href="/store"
          className="inline-block px-6 py-3 bg-theme-primary text-white rounded-md hover:opacity-90 transition-opacity font-medium"
        >
          Shop the collection
        </LocalizedClientLink>
        {hasContact && (
          <LocalizedClientLink
            href="/contact"
            className="inline-block px-6 py-3 border border-ui-border-base rounded-md hover:bg-ui-bg-subtle transition-colors font-medium"
          >
            Contact us
          </LocalizedClientLink>
        )}
      </div>
    </div>
  )
}
