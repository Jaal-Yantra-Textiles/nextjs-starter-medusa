import { HttpTypes } from "@medusajs/types"
import ProductRail from "@modules/home/components/featured-products/product-rail"

export default async function FeaturedProducts({
  collections,
  region,
  maxProducts,
  sampleProductName,
}: {
  collections: HttpTypes.StoreCollection[]
  region: HttpTypes.StoreRegion
  maxProducts?: number
  sampleProductName?: string
}) {
  return collections.map((collection) => (
    <li key={collection.id}>
      <ProductRail
        collection={collection}
        region={region}
        maxProducts={maxProducts}
        sampleProductName={sampleProductName}
      />
    </li>
  ))
}
