import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { WebsiteTheme } from "@lib/data/website"

import ProductActionsWrapper from "./product-actions-wrapper"

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

  const lowestPrice = product.variants
    ?.map((v: any) => v.calculated_price?.calculated_amount)
    .filter((p: any) => p != null)
    .sort((a: number, b: number) => a - b)[0]

  const currencyCode =
    product.variants?.[0]?.calculated_price?.currency_code || region.currency_code

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || undefined,
    image: product.thumbnail || undefined,
    material: product.material || undefined,
    ...(lowestPrice != null && {
      offers: {
        "@type": "Offer",
        price: lowestPrice,
        priceCurrency: currencyCode?.toUpperCase(),
        availability: "https://schema.org/InStock",
      },
    }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div
        className="content-container flex flex-col small:flex-row small:items-start py-6 relative"
        data-testid="product-container"
      >
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-6">
          <ProductInfo product={product} />
          {showTabs && <ProductTabs product={product} />}
        </div>
        <div className="block w-full relative">
          <ImageGallery images={images} />
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
