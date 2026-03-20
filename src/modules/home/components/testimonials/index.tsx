import { WebsiteTheme } from "@lib/data/website"

export default function Testimonials({
  theme,
  isThemeEditor,
}: {
  theme?: WebsiteTheme | null
  isThemeEditor?: boolean
}) {
  const config = theme?.home_sections?.testimonials
  const heading = config?.heading || "What our customers say"
  const items = config?.items

  const sectionAttrs = isThemeEditor ? { "data-theme-section": "testimonials" } : {}

  // Default items for editor preview
  const displayItems =
    items && items.length > 0
      ? items
      : isThemeEditor
        ? [
            {
              quote: "Amazing quality and fast shipping. Will definitely order again!",
              author: "Sarah M.",
              role: "Verified Buyer",
            },
            {
              quote: "The best fabrics I've found online. Customer service is excellent too.",
              author: "James R.",
              role: "Repeat Customer",
            },
            {
              quote: "Beautiful products, exactly as described. Highly recommend!",
              author: "Priya K.",
              role: "Verified Buyer",
            },
          ]
        : null

  if (!displayItems) return null

  return (
    <div className="w-full bg-ui-bg-subtle" {...sectionAttrs}>
      <div className="content-container py-12 small:py-20">
        <h2 className="text-2xl small:text-3xl font-semibold text-center text-ui-fg-base mb-10">
          {heading}
        </h2>
        <div
          className={`grid gap-6 ${
            displayItems.length === 1
              ? "grid-cols-1 max-w-lg mx-auto"
              : displayItems.length === 2
                ? "grid-cols-1 small:grid-cols-2"
                : "grid-cols-1 small:grid-cols-2 medium:grid-cols-3"
          }`}
        >
          {displayItems.map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-lg p-6 small:p-8 border border-ui-border-base"
            >
              <svg
                className="w-8 h-8 text-theme-primary/30 mb-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-ui-fg-base leading-relaxed mb-4">
                {item.quote}
              </p>
              <div className="flex items-center gap-3">
                {item.avatar_url ? (
                  <img
                    src={item.avatar_url}
                    alt={item.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary font-medium text-sm">
                    {item.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-ui-fg-base">
                    {item.author}
                  </p>
                  {item.role && (
                    <p className="text-xs text-ui-fg-subtle">{item.role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
