import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import HomeCategories from "@modules/home/components/home-categories"
import TrustBanner from "@modules/home/components/trust-banner"
import TextWithImage from "@modules/home/components/text-with-image"
import Testimonials from "@modules/home/components/testimonials"
import Banner from "@modules/home/components/banner"
import Newsletter from "@modules/home/components/newsletter"
import AnimatedSection from "@modules/home/components/animated-section"
import { listCollections } from "@lib/data/collections"
import { listCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { getWebsite, AnimationType } from "@lib/data/website"
import {
  buildLocalizedAlternates,
  getFirstProductImageFor,
} from "@lib/util/seo"
import { getRequestBaseURL } from "@lib/util/base-url"

import ThemeEditorBridge from "@modules/layout/components/theme-editor-bridge"


export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const alternates = await buildLocalizedAlternates(countryCode, "")

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Store"
  const title = storeName
  const description =
    "Shop handmade, locally sourced, and ethically produced fashion."

  // Use the first catalogue product's thumbnail as the homepage OG image
  // so social shares render a rich card rather than a plain text snippet.
  // Falls back to the static logo.
  const firstProductImage = await getFirstProductImageFor({ countryCode })
  const baseUrl = await getRequestBaseURL()
  const ogImage = firstProductImage ?? `${baseUrl}/logo.png`

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await props.params
  const search = await props.searchParams
  const isThemeEditor = search.theme_editor === "true"

  const { countryCode } = params

  const [region, { collections }, categories, website] = await Promise.all([
    getRegion(countryCode),
    listCollections({ fields: "id, handle, title" }),
    listCategories().catch(() => []),
    getWebsite(undefined, { noCache: isThemeEditor }).catch(() => null),
  ])

  if (!region) return null

  const theme = website?.theme
  const hs = theme?.home_sections
  const animations = theme?.animations
  const animationsEnabled = animations?.enabled !== false
  const sectionAnimation: AnimationType = animationsEnabled
    ? (animations?.section_entrance === "stagger" ? "fade-up" : animations?.section_entrance || "none")
    : "none"
  const staggerDelay = animations?.stagger_delay || 100
  const useStagger = animationsEnabled && animations?.section_entrance === "stagger"

  const showCollections = hs?.show_featured_collections !== false
  const showCategories = hs?.show_categories === true
  const sectionsOrder = hs?.sections_order || ["hero", "collections", "categories"]
  const collectionCount = hs?.featured_collection_count || collections?.length || 3
  const productsPerCollection = hs?.products_per_collection || 3
  const collectionHeading = hs?.collection_heading
  const categoryHeading = hs?.category_heading

  const displayCollections = collections?.slice(0, collectionCount) || []
  const topCategories = (categories || []).filter((c: any) => !c.parent_category).slice(0, 6)

  let sectionIndex = 0
  const renderSection = (section: string) => {
    const idx = sectionIndex++
    const delay = useStagger ? idx * staggerDelay : 0

    switch (section) {
      case "hero":
        return <Hero key="hero" theme={theme} isThemeEditor={isThemeEditor} />
      case "collections":
        return showCollections && displayCollections.length > 0 ? (
          <AnimatedSection
            key="collections"
            animation={sectionAnimation}
            delay={delay}
            data-theme-section="collections"
          >
            {collectionHeading && (
              <div className="content-container pt-12">
                <h2 className="text-2xl font-semibold" data-theme-el="collection-heading">
                  {collectionHeading}
                </h2>
              </div>
            )}
            <ul className="flex flex-col gap-x-6">
              <FeaturedProducts
                collections={displayCollections}
                region={region}
                maxProducts={productsPerCollection}
                sampleProductName={hs?.empty_state_product_name}
              />
            </ul>
          </AnimatedSection>
        ) : showCollections && isThemeEditor ? (
          <AnimatedSection
            key="collections"
            animation={sectionAnimation}
            delay={delay}
            data-theme-section="collections"
            className="content-container py-12"
          >
            <h2 className="text-2xl font-semibold text-ui-fg-subtle" data-theme-el="collection-heading">
              {collectionHeading || "Featured Collections"}
            </h2>
            <SampleProductGrid name={hs?.empty_state_product_name} />
          </AnimatedSection>
        ) : null
      case "categories":
        return showCategories ? (
          <AnimatedSection key="categories" animation={sectionAnimation} delay={delay}>
            <HomeCategories
              categories={topCategories}
              heading={categoryHeading}
              isThemeEditor={isThemeEditor}
            />
          </AnimatedSection>
        ) : null
      case "trust_banner":
        return (
          <AnimatedSection key="trust_banner" animation={sectionAnimation} delay={delay}>
            <TrustBanner theme={theme} isThemeEditor={isThemeEditor} />
          </AnimatedSection>
        )
      case "text_with_image":
        return (
          <AnimatedSection key="text_with_image" animation={sectionAnimation} delay={delay}>
            <TextWithImage theme={theme} isThemeEditor={isThemeEditor} />
          </AnimatedSection>
        )
      case "testimonials":
        return (
          <AnimatedSection key="testimonials" animation={sectionAnimation} delay={delay}>
            <Testimonials theme={theme} isThemeEditor={isThemeEditor} />
          </AnimatedSection>
        )
      case "banner":
        return (
          <AnimatedSection key="banner" animation={sectionAnimation} delay={delay}>
            <Banner theme={theme} isThemeEditor={isThemeEditor} />
          </AnimatedSection>
        )
      case "newsletter":
        return (
          <AnimatedSection key="newsletter" animation={sectionAnimation} delay={delay}>
            <Newsletter theme={theme} isThemeEditor={isThemeEditor} />
          </AnimatedSection>
        )
      default:
        return null
    }
  }

  return (
    <>
      {sectionsOrder.map(renderSection)}
      {isThemeEditor && <ThemeEditorBridge />}
    </>
  )
}

function SampleProductGrid({ name }: { name?: string }) {
  const productName = name || "Sample Product"
  return (
    <div className="grid grid-cols-2 small:grid-cols-3 gap-x-6 gap-y-12 mt-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="group">
          <div className="aspect-[11/14] bg-ui-bg-subtle rounded-lg mb-4" />
          <div className="flex justify-between">
            <span className="text-ui-fg-subtle text-sm">{productName} {i}</span>
            <span className="text-ui-fg-muted text-sm">$0.00</span>
          </div>
        </div>
      ))}
    </div>
  )
}
