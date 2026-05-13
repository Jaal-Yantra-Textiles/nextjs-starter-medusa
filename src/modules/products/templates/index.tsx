import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import { WebsiteTheme } from "@lib/data/website"
import { buildBreadcrumbJsonLd } from "@lib/util/breadcrumb-jsonld"

import ProductActionsWrapper from "./product-actions-wrapper"
import { buildProductJsonLd } from "./product-jsonld"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  theme?: WebsiteTheme | null
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
  theme,
}) => {
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

  const jsonLd = buildProductJsonLd(product, {
    countryCode,
    fallbackCurrency: region.currency_code,
  })

  const breadcrumbLd = buildBreadcrumbJsonLd(breadcrumbTrail)

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
      <div
        className="content-container flex flex-col small:flex-row small:items-start py-6 relative"
        data-testid="product-container"
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
