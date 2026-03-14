"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

const STORE_HANDLE = process.env.NEXT_PUBLIC_STORE_HANDLE

export const retrieveCollection = async (id: string) => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  if (STORE_HANDLE) {
    // Fetch partner-scoped collections and find by ID
    return sdk.client
      .fetch<{ collections: HttpTypes.StoreCollection[] }>(
        `/web/storefront/${STORE_HANDLE}/collections`,
        {
          next,
          cache: "force-cache",
        }
      )
      .then(({ collections }) => collections.find((c) => c.id === id)!)
  }

  return sdk.client
    .fetch<{ collection: HttpTypes.StoreCollection }>(
      `/store/collections/${id}`,
      {
        next,
        cache: "force-cache",
      }
    )
    .then(({ collection }) => collection)
}

export const listCollections = async (
  queryParams: Record<string, string> = {}
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  if (STORE_HANDLE) {
    // Fetch partner-scoped collections
    return sdk.client
      .fetch<{ collections: HttpTypes.StoreCollection[]; count: number }>(
        `/web/storefront/${STORE_HANDLE}/collections`,
        {
          query: queryParams,
          next,
          cache: "force-cache",
        }
      )
      .then(({ collections }) => ({ collections, count: collections.length }))
  }

  queryParams.limit = queryParams.limit || "100"
  queryParams.offset = queryParams.offset || "0"

  return sdk.client
    .fetch<{ collections: HttpTypes.StoreCollection[]; count: number }>(
      "/store/collections",
      {
        query: queryParams,
        next,
        cache: "force-cache",
      }
    )
    .then(({ collections }) => ({ collections, count: collections.length }))
}

export const getCollectionByHandle = async (
  handle: string
): Promise<HttpTypes.StoreCollection> => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  if (STORE_HANDLE) {
    // Fetch partner-scoped collections and find by handle
    return sdk.client
      .fetch<{ collections: HttpTypes.StoreCollection[] }>(
        `/web/storefront/${STORE_HANDLE}/collections`,
        {
          next,
          cache: "force-cache",
        }
      )
      .then(({ collections }) => collections.find((c) => c.handle === handle)!)
  }

  return sdk.client
    .fetch<HttpTypes.StoreCollectionListResponse>(`/store/collections`, {
      query: { handle, fields: "*products" },
      next,
      cache: "force-cache",
    })
    .then(({ collections }) => collections[0])
}
