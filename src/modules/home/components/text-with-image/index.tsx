import { WebsiteTheme } from "@lib/data/website"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function TextWithImage({
  theme,
  isThemeEditor,
}: {
  theme?: WebsiteTheme | null
  isThemeEditor?: boolean
}) {
  const config = theme?.home_sections?.text_with_image
  const title = config?.title
  const description = config?.description
  const imageUrl = config?.image_url
  const ctaText = config?.cta_text
  const ctaLink = config?.cta_link || "/store"
  const layout = config?.layout || "image-right"

  const sectionAttrs = isThemeEditor ? { "data-theme-section": "text_with_image" } : {}

  // Only render if there's content or in editor mode
  if (!title && !description && !imageUrl && !isThemeEditor) return null

  const imageBlock = (
    <div className="relative aspect-[4/3] small:aspect-auto small:h-full min-h-[300px] rounded-lg overflow-hidden">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title || ""}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-ui-bg-subtle flex items-center justify-center">
          <span className="text-ui-fg-muted text-sm">Image</span>
        </div>
      )}
    </div>
  )

  const textBlock = (
    <div className="flex flex-col justify-center gap-4 py-8 small:py-0">
      {title && (
        <h2 className="text-2xl small:text-3xl font-semibold text-ui-fg-base">
          {title}
        </h2>
      )}
      {description && (
        <p className="text-base text-ui-fg-subtle max-w-lg leading-relaxed">
          {description}
        </p>
      )}
      {ctaText && (
        <div>
          <LocalizedClientLink
            href={ctaLink}
            className="inline-block px-6 py-3 bg-theme-primary text-white rounded-md hover:opacity-90 transition-opacity font-medium"
          >
            {ctaText}
          </LocalizedClientLink>
        </div>
      )}
    </div>
  )

  return (
    <div className="w-full" {...sectionAttrs}>
      <div className="content-container py-12 small:py-20">
        <div className="grid grid-cols-1 small:grid-cols-2 gap-8 small:gap-12 items-center">
          {layout === "image-left" ? (
            <>
              {imageBlock}
              {textBlock}
            </>
          ) : (
            <>
              {textBlock}
              {imageBlock}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
