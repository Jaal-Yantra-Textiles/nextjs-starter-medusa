import { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import MakerStory from "@modules/products/components/artisan-detail/maker-story"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import { WebsiteTheme } from "@lib/data/website"
import { buildBreadcrumbJsonLd } from "@lib/util/breadcrumb-jsonld"

import ProductActionsWrapper from "./product-actions-wrapper"
import ProductionSpec from "@modules/products/components/production-spec"
import ProductDetailBand from "@modules/products/components/detail-band"
import { buildProductJsonLd } from "./product-jsonld"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  theme?: WebsiteTheme | null
}

const ProductTemplate = async ({
  product,
  region,
  countryCode,
  images,
  theme,
}: ProductTemplateProps) => {
  if (!product || !product.id) {
    return notFound()
  }

  const pt = theme?.product_page
  const showTabs = pt?.show_tabs !== false
  const showRelated = pt?.show_related_products !== false
  const showBreadcrumbs = pt?.show_breadcrumbs ?? false
  const showSku = pt?.show_sku ?? false
  const showStockStatus = pt?.show_stock_status ?? false
  const imageLayout = pt?.image_layout ?? "gallery"
  const galleryPosition = pt?.gallery_position
  const descriptionLayout = pt?.description_layout ?? "accordion"

  // The band renders the same spec under the same "Made to" label, so only one
  // of the two may claim it. The band wins when the theme asked for it: a
  // partner who arranged their band deliberately should not have a second copy
  // appear above it.
  const bandShowsSpec =
    pt?.detail_band?.enabled === true &&
    (pt.detail_band.blocks ?? []).some(
      (b) => b.source === "spec" && b.enabled !== false
    )

  const breadcrumbTrail: Array<{ name: string; path: string }> = [
    { name: "Home", path: `/${countryCode}` },
    ...(product.collection
      ? [
          {
            name: product.collection.title,
            path: `/${countryCode}/collections/${product.collection.handle}`,
          },
        ]
      : []),
    {
      name: product.title || "Product",
      path: `/${countryCode}/products/${product.handle}`,
    },
  ]

  const jsonLd = await buildProductJsonLd(product, {
    countryCode,
    fallbackCurrency: region.currency_code,
    storeName: theme?.branding?.store_name,
  })

  const breadcrumbLd = await buildBreadcrumbJsonLd(breadcrumbTrail)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {showBreadcrumbs && (
        <nav
          aria-label="Breadcrumb"
          className="content-container pt-4 text-ui-fg-subtle txt-compact-small"
          data-testid="product-breadcrumbs"
        >
          <ol className="flex flex-wrap items-center gap-x-2">
            {breadcrumbTrail.map((crumb, idx) => {
              const isLast = idx === breadcrumbTrail.length - 1
              return (
                <li key={crumb.path} className="flex items-center gap-x-2">
                  {idx > 0 && <span aria-hidden>/</span>}
                  {isLast ? (
                    <span aria-current="page" className="text-ui-fg-base">
                      {crumb.name}
                    </span>
                  ) : (
                    <LocalizedClientLink
                      href={crumb.path.replace(`/${countryCode}`, "") || "/"}
                      className="hover:text-ui-fg-base"
                    >
                      {crumb.name}
                    </LocalizedClientLink>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}
      {/* `data-theme-section` is what the theme editor's bridge outlines and
          selects; the editor already maps a click on `product` to its
          product_page panel. Without the attribute the product page rendered
          inside the editor iframe had nothing selectable at all. */}
      <div
        className="content-container flex flex-col small:flex-row small:items-start py-6 relative"
        data-testid="product-container"
        data-theme-section="product"
      >
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-6">
          <ProductInfo
            product={product}
            showSku={showSku}
            showStockStatus={showStockStatus}
          />
          {showTabs && (
            <ProductTabs product={product} layout={descriptionLayout} />
          )}
          <MakerStory product={product} />
        </div>
        <div
          className={clx(
            "block w-full relative",
            galleryPosition === "left" && "order-first",
            galleryPosition === "right" && "order-last"
          )}
        >
          <ImageGallery images={images} layout={imageLayout} />
        </div>
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-12">
          <ProductOnboardingCta />
          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
                ctaText={pt?.cta_text}
              />
            }
          >
            <ProductActionsWrapper id={product.id} region={region} ctaText={pt?.cta_text} />
          </Suspense>
        </div>
      </div>
      {/* "Made to" used to sit in the buying column, where a two-column
          definition list had 300px to live in and every row wrapped. It is
          reference detail about the cloth, not a buying control — the ordering
          controls moved out to the buying column in #1365 and this is what was
          left — so it belongs below the gallery at full width, where the rows
          can breathe and a buyer reads it after the images rather than beside
          them.

          Suppressed when the theme's detail band already carries a `spec`
          block: that block's default label is "Made to" and its content is the
          same spec, so rendering both would print the section twice under one
          heading. */}
      {!bandShowsSpec && (
        <div
          className="content-container mt-6 small:mt-10"
          data-testid="product-made-to"
        >
          <Suspense fallback={null}>
            <ProductionSpec product={product} />
          </Suspense>
        </div>
      )}
      {/* #1364 — the band that fills the space between the three-column row
          and Related Products. Renders nothing unless the theme turned it on
          AND this product can fill at least one of its blocks. */}
      <Suspense fallback={null}>
        <ProductDetailBand product={product} theme={theme} />
      </Suspense>
      {showRelated && (
        <div
          className="content-container my-16 small:my-32"
          data-testid="related-products-container"
        >
          <Suspense fallback={<SkeletonRelatedProducts />}>
            <RelatedProducts
              product={product}
              countryCode={countryCode}
              heading={pt?.related_heading}
            />
          </Suspense>
        </div>
      )}
    </>
  )
}

export default ProductTemplate
