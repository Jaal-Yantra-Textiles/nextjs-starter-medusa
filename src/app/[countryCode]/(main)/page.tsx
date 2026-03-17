import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import HomeCategories from "@modules/home/components/home-categories"
import { listCollections } from "@lib/data/collections"
import { listCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { getWebsite } from "@lib/data/website"
import ThemeEditorBridge from "@modules/layout/components/theme-editor-bridge"

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_STORE_NAME || "Store",
  description: "A performant frontend ecommerce starter template.",
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
    getWebsite().catch(() => null),
  ])

  if (!region) return null

  const hs = website?.theme?.home_sections
  const showCollections = hs?.show_featured_collections !== false
  const showCategories = hs?.show_categories === true
  const sectionsOrder = hs?.sections_order || ["hero", "collections", "categories"]
  const collectionCount = hs?.featured_collection_count || collections?.length || 3
  const productsPerCollection = hs?.products_per_collection || 3
  const collectionHeading = hs?.collection_heading
  const categoryHeading = hs?.category_heading

  const displayCollections = collections?.slice(0, collectionCount) || []
  const topCategories = (categories || []).filter((c: any) => !c.parent_category).slice(0, 6)

  const renderSection = (section: string) => {
    switch (section) {
      case "hero":
        return <Hero key="hero" theme={website?.theme} isThemeEditor={isThemeEditor} />
      case "collections":
        return showCollections && displayCollections.length > 0 ? (
          <div key="collections" data-theme-section="collections">
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
          </div>
        ) : showCollections && isThemeEditor ? (
          <div key="collections" data-theme-section="collections" className="content-container py-12">
            <h2 className="text-2xl font-semibold text-ui-fg-subtle" data-theme-el="collection-heading">
              {collectionHeading || "Featured Collections"}
            </h2>
            <SampleProductGrid name={hs?.empty_state_product_name} />
          </div>
        ) : null
      case "categories":
        return showCategories ? (
          <HomeCategories
            key="categories"
            categories={topCategories}
            heading={categoryHeading}
            isThemeEditor={isThemeEditor}
          />
        ) : null
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
