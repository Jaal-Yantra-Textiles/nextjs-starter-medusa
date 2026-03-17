import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

import InteractiveLink from "@modules/common/components/interactive-link"
import ProductPreview from "@modules/products/components/product-preview"

export default async function ProductRail({
  collection,
  region,
  maxProducts,
  sampleProductName,
}: {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
  maxProducts?: number
  sampleProductName?: string
}) {
  const limit = maxProducts || 3
  const {
    response: { products: pricedProducts },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      fields: "*variants.calculated_price",
      limit,
    },
  })

  const hasProducts = pricedProducts && pricedProducts.length > 0

  return (
    <div className="content-container py-12 small:py-24">
      <div className="flex justify-between mb-8">
        <Text className="txt-xlarge">{collection.title}</Text>
        <InteractiveLink href={`/collections/${collection.handle}`}>
          View all
        </InteractiveLink>
      </div>
      <ul className="grid grid-cols-2 small:grid-cols-3 gap-x-6 gap-y-24 small:gap-y-36">
        {hasProducts
          ? pricedProducts.map((product) => (
              <li key={product.id}>
                <ProductPreview product={product} region={region} isFeatured />
              </li>
            ))
          : Array.from({ length: limit }).map((_, i) => (
              <li key={`sample-${i}`}>
                <div className="group">
                  <div className="aspect-[11/14] bg-ui-bg-subtle rounded-lg mb-4" />
                  <div className="flex txt-compact-medium mt-4 justify-between">
                    <Text className="text-ui-fg-subtle">
                      {sampleProductName || collection.title || "Product"} {i + 1}
                    </Text>
                    <Text className="text-ui-fg-muted">$0.00</Text>
                  </div>
                </div>
              </li>
            ))}
      </ul>
    </div>
  )
}
