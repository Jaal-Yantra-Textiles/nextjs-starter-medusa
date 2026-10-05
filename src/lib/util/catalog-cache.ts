/**
 * Expiry for cached collection and category lists.
 *
 * Like products (see PRODUCT_CACHE_TTL_SECONDS), these were `force-cache` with
 * only a per-visitor tag that nothing revalidates — so a collection or
 * category created in the admin never appeared on a storefront until its data
 * cache happened to be cleared. They change far less often than stock, so the
 * default is longer. Tune with CATALOG_CACHE_TTL_SECONDS; 0 disables caching.
 *
 * Lives outside the `"use server"` data files, which may export only async
 * functions.
 */
const CATALOG_CACHE_TTL_SECONDS = Number.parseInt(
  process.env.CATALOG_CACHE_TTL_SECONDS ?? "300",
  10
)

const ttlOn =
  Number.isFinite(CATALOG_CACHE_TTL_SECONDS) && CATALOG_CACHE_TTL_SECONDS > 0

/** Adds the expiry to a fetch's `next` options (keeps any cache tags). */
export const withCatalogTtl = (
  next: Record<string, unknown>
): Record<string, unknown> =>
  ttlOn ? { ...next, revalidate: CATALOG_CACHE_TTL_SECONDS } : next

/** `no-store` when the TTL is off — never force-cache with no expiry. */
export const catalogCacheMode = (): RequestCache =>
  ttlOn ? "force-cache" : "no-store"
