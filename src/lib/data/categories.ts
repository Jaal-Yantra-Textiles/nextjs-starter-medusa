import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"
import { catalogCacheMode, withCatalogTtl } from "@lib/util/catalog-cache"

export const listCategories = async (query?: Record<string, any>) => {
  const next = withCatalogTtl({
    ...(await getCacheOptions("categories")),
  })

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: { limit: 100, ...query },
        next,
        cache: catalogCacheMode(),
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = withCatalogTtl({
    ...(await getCacheOptions("categories")),
  })

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      `/store/product-categories`,
      {
        query: { handle },
        next,
        cache: catalogCacheMode(),
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
