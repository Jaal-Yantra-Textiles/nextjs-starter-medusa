import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

const STORE_HANDLE = process.env.NEXT_PUBLIC_STORE_HANDLE

export const listCategories = async (query?: Record<string, any>) => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  if (STORE_HANDLE) {
    // Fetch partner-scoped categories
    return sdk.client
      .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
        `/web/storefront/${STORE_HANDLE}/categories`,
        {
          query,
          next,
          cache: "force-cache",
        }
      )
      .then(({ product_categories }) => product_categories)
  }

  // Fallback to global categories when no store handle is set
  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "*category_children, *products, *parent_category, *parent_category.parent_category",
          limit,
          ...query,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
  }

  if (STORE_HANDLE) {
    // Fetch partner-scoped categories and find by handle
    return sdk.client
      .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
        `/web/storefront/${STORE_HANDLE}/categories`,
        {
          next,
          cache: "force-cache",
        }
      )
      .then(({ product_categories }) =>
        product_categories.find((c) => c.handle === handle)
      )
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
