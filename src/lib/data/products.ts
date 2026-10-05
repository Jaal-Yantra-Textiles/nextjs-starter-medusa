"use server"

import { sdk } from "@lib/config"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

/**
 * How long a cached product response may stay stale, in seconds.
 *
 * 🔴 Product fetches were `force-cache` with only a per-visitor tag, and
 * nothing ever revalidates the "products" tag — so the FIRST response for a
 * URL was served for the life of the data cache. On 2026-10-05 gof.asia was
 * still rendering its 8 Sep snapshot: the 100s/150S muslin at 0 stock (the
 * backend said 10) and none of the 12 m packs added that morning. A customer
 * was told "out of stock" for cloth that was on the shelf.
 *
 * Stock and price are the two things a product page must not get wrong, so
 * this TTL is short. Same shape as WEBSITE_CACHE_TTL_SECONDS: tune with
 * PRODUCT_CACHE_TTL_SECONDS; 0 disables caching.
 */
const PRODUCT_CACHE_TTL_SECONDS = Number.parseInt(
  process.env.PRODUCT_CACHE_TTL_SECONDS ?? "60",
  10
)

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next: Record<string, unknown> = {
    ...(await getCacheOptions("products")),
  }
  const productTtl =
    Number.isFinite(PRODUCT_CACHE_TTL_SECONDS) && PRODUCT_CACHE_TTL_SECONDS > 0
  if (productTtl) {
    next.revalidate = PRODUCT_CACHE_TTL_SECONDS
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags,+artisan_detail.*,",
          ...queryParams,
        },
        headers,
        next,
        // `no-store` when the TTL is disabled — never force-cache with no expiry.
        cache: productTtl ? "force-cache" : "no-store",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12

  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}
