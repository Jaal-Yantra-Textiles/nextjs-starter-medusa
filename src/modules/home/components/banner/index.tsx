import { WebsiteTheme } from "@lib/data/website"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function Banner({
  theme,
  isThemeEditor,
}: {
  theme?: WebsiteTheme | null
  isThemeEditor?: boolean
}) {
  const config = theme?.home_sections?.banner
  const title = config?.title
  const description = config?.description
  const bgImage = config?.background_image_url
  const bgColor = config?.background_color
  const ctaText = config?.cta_text
  const ctaLink = config?.cta_link || "/store"

  const sectionAttrs = isThemeEditor ? { "data-theme-section": "banner" } : {}

  if (!title && !description && !isThemeEditor) return null

  const hasBgImage = !!bgImage
  const textColor = hasBgImage ? "text-white" : "text-ui-fg-base"
  const subtitleColor = hasBgImage ? "text-white/80" : "text-ui-fg-subtle"

  return (
    <div className="w-full" {...sectionAttrs}>
      <div
        className="relative w-full py-16 small:py-24 overflow-hidden"
        style={{
          ...(bgImage
            ? {
                backgroundImage: `url(${bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}),
          ...(bgColor && !bgImage ? { backgroundColor: bgColor } : {}),
          ...(!bgColor && !bgImage ? { backgroundColor: "var(--theme-primary, #7c3aed)" } : {}),
        }}
      >
        {/* Overlay for background image */}
        {hasBgImage && (
          <div className="absolute inset-0 bg-black/40" />
        )}

        <div className="relative z-10 content-container text-center">
          {title && (
            <h2
              className={`text-2xl small:text-4xl font-semibold mb-4 ${
                hasBgImage || !bgColor ? "text-white" : textColor
              }`}
            >
              {title}
            </h2>
          )}
          {description && (
            <p
              className={`text-base small:text-lg max-w-2xl mx-auto mb-8 ${
                hasBgImage || !bgColor ? "text-white/80" : subtitleColor
              }`}
            >
              {description}
            </p>
          )}
          {ctaText && (
            <LocalizedClientLink
              href={ctaLink}
              className={`inline-block px-8 py-3 rounded-md font-medium transition-opacity hover:opacity-90 ${
                hasBgImage || !bgColor
                  ? "bg-white text-ui-fg-base"
                  : "bg-theme-primary text-white"
              }`}
            >
              {ctaText}
            </LocalizedClientLink>
          )}
          {isThemeEditor && !title && !description && (
            <p className="text-white/60 text-sm">
              Configure banner title, description, and CTA in theme settings
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
