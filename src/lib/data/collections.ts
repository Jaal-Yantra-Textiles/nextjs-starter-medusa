"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"
import { catalogCacheMode, withCatalogTtl } from "@lib/util/catalog-cache"

export const retrieveCollection = async (id: string) => {
  const next = withCatalogTtl({
    ...(await getCacheOptions("collections")),
  })

  return sdk.client
    .fetch<{ collection: HttpTypes.StoreCollection }>(
      `/store/collections/${id}`,
      {
        next,
        cache: catalogCacheMode(),
      }
    )
    .then(({ collection }) => collection)
}

export const listCollections = async (
  queryParams: Record<string, string> = {}
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
  const next = withCatalogTtl({
    ...(await getCacheOptions("collections")),
  })

  return sdk.client
    .fetch<{ collections: HttpTypes.StoreCollection[]; count: number }>(
      "/store/collections",
      {
        query: { limit: 100, ...queryParams },
        next,
        cache: catalogCacheMode(),
      }
    )
    .then(({ collections, count }) => ({ collections, count }))
}

export const getCollectionByHandle = async (
  handle: string
): Promise<HttpTypes.StoreCollection> => {
  const next = withCatalogTtl({
    ...(await getCacheOptions("collections")),
  })

  return sdk.client
    .fetch<{ collections: HttpTypes.StoreCollection[] }>(`/store/collections`, {
      query: { handle },
      next,
      cache: catalogCacheMode(),
    })
    .then(({ collections }) => collections[0])
}
