import { listProducts } from "@lib/data/products"
import { getGeoUnservedCountry } from "@lib/data/cookies"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
  ctaText,
}: {
  id: string
  region: HttpTypes.StoreRegion
  ctaText?: string
}) {
  const [product, unservedCountry] = await Promise.all([
    listProducts({
      queryParams: { id: [id] },
      regionId: region.id,
    }).then(({ response }) => response.products[0]),
    getGeoUnservedCountry(),
  ])

  if (!product) {
    return null
  }

  return (
    <ProductActions
      product={product}
      region={region}
      ctaText={ctaText}
      unservedCountry={unservedCountry}
    />
  )
}
