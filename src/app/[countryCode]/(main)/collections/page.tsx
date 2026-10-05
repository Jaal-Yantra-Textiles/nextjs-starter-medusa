import { Metadata } from "next"

import { listCollections } from "@lib/data/collections"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * `/collections` — theme navigation links here ("Collections"), but only
 * `/collections/[handle]` existed, so the link was a 404. Lists the store's
 * collections; each card opens the collection page.
 */

export const metadata: Metadata = { title: "Collections" }

const imageFor = (c: any): string | null =>
  c?.metadata?.thumbnail ||
  c?.metadata?.image_url ||
  c?.metadata?.og_image ||
  c?.products?.find((p: any) => p?.thumbnail)?.thumbnail ||
  null

export default async function CollectionsPage() {
  let collections: any[] = []
  try {
    const res = await listCollections({
      fields: "id,title,handle,metadata,products.thumbnail",
    })
    collections = res.collections ?? []
  } catch {
    collections = []
  }

  return (
    <div className="content-container py-12 small:py-16" data-testid="collections-page">
      <h1 className="text-2xl small:text-3xl font-semibold mb-8">Collections</h1>

      {collections.length === 0 ? (
        <div className="flex flex-col gap-4 items-start">
          <p className="text-ui-fg-subtle">No collections yet.</p>
          <LocalizedClientLink
            href="/store"
            className="inline-block px-6 py-3 bg-theme-primary text-white rounded-md hover:opacity-90 transition-opacity font-medium"
          >
            Shop all products
          </LocalizedClientLink>
        </div>
      ) : (
        <ul className="grid grid-cols-1 xsmall:grid-cols-2 small:grid-cols-3 gap-6">
          {collections.map((c) => {
            const img = imageFor(c)
            return (
              <li key={c.id}>
                <LocalizedClientLink
                  href={`/collections/${c.handle}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-ui-bg-subtle mb-3">
                    {img ? (
                      <img
                        src={img}
                        alt={c.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : null}
                  </div>
                  <span className="text-base font-medium group-hover:underline">
                    {c.title}
                  </span>
                </LocalizedClientLink>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
