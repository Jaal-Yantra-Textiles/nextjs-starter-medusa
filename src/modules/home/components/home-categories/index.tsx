import { Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Category = {
  id: string
  name: string
  handle: string
  description?: string | null
  category_children?: Array<{ id: string; name: string; handle: string }>
}

export default function HomeCategories({
  categories,
  heading,
  isThemeEditor,
}: {
  categories: Category[]
  heading?: string
  isThemeEditor?: boolean
}) {
  if (!categories.length && !isThemeEditor) return null

  const displayCategories =
    categories.length > 0
      ? categories
      : [
          { id: "s1", name: "Category 1", handle: "#", category_children: [] },
          { id: "s2", name: "Category 2", handle: "#", category_children: [] },
          { id: "s3", name: "Category 3", handle: "#", category_children: [] },
        ]

  return (
    <div className="content-container py-12" data-theme-section="categories">
      <h2
        className="text-2xl font-semibold mb-8"
        data-theme-el="category-heading"
      >
        {heading || "Shop by Category"}
      </h2>
      <div className="grid grid-cols-2 small:grid-cols-3 gap-4">
        {displayCategories.map((cat) => (
          <LocalizedClientLink
            key={cat.id}
            href={`/categories/${cat.handle}`}
            className="group relative flex items-end p-6 h-40 rounded-lg bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover transition-colors border border-ui-border-base"
          >
            <div>
              <Text className="font-medium text-ui-fg-base group-hover:text-ui-fg-interactive transition-colors">
                {cat.name}
              </Text>
              {cat.category_children && cat.category_children.length > 0 && (
                <Text size="small" className="text-ui-fg-muted mt-0.5">
                  {cat.category_children.length} subcategories
                </Text>
              )}
            </div>
          </LocalizedClientLink>
        ))}
      </div>
    </div>
  )
}
