import { WebsiteTheme } from "@lib/data/website"

export default function TrustBanner({
  theme,
  isThemeEditor,
}: {
  theme?: WebsiteTheme | null
  isThemeEditor?: boolean
}) {
  const config = theme?.home_sections?.trust_banner
  const items = config?.items
  const bgColor = config?.background

  const sectionAttrs = isThemeEditor ? { "data-theme-section": "trust_banner" } : {}

  // Default items for editor preview when none configured
  const displayItems =
    items && items.length > 0
      ? items
      : isThemeEditor
        ? [
            { icon: "🚚", text: "Free Shipping" },
            { icon: "↩️", text: "Easy Returns" },
            { icon: "🔒", text: "Secure Checkout" },
            { icon: "💬", text: "24/7 Support" },
          ]
        : null

  if (!displayItems) return null

  return (
    <div
      className="w-full border-b border-ui-border-base"
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      {...sectionAttrs}
    >
      <div className="content-container py-4">
        <div
          className={`grid gap-4 ${
            displayItems.length <= 2
              ? "grid-cols-1 small:grid-cols-2"
              : displayItems.length === 3
                ? "grid-cols-1 small:grid-cols-3"
                : "grid-cols-2 small:grid-cols-4"
          }`}
        >
          {displayItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-center gap-2 py-2 text-sm text-ui-fg-base"
            >
              {item.icon && <span className="text-lg flex-shrink-0">{item.icon}</span>}
              <span className="font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
