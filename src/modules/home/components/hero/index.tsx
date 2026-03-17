import { Heading, Text } from "@medusajs/ui"
import { STORE_NAME } from "@lib/constants"
import { WebsiteTheme } from "@lib/data/website"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = ({ theme, isThemeEditor }: { theme?: WebsiteTheme | null; isThemeEditor?: boolean }) => {
  const hero = theme?.hero
  const layout = hero?.layout || "center"
  const title = hero?.title || STORE_NAME
  const subtitle = hero?.subtitle || "Welcome to our store"
  const description = hero?.description
  const badgeText = hero?.badge_text
  const bgImage = hero?.background_image_url
  const overlayOpacity = hero?.overlay_opacity ?? 0
  const ctaText = hero?.cta_text
  const ctaLink = hero?.cta_link || "/store"
  const secondaryCtaText = hero?.secondary_cta_text
  const secondaryCtaLink = hero?.secondary_cta_link || "/store"
  const features = hero?.features

  const sectionAttrs = isThemeEditor ? { "data-theme-section": "hero" } : {}

  // Split layout: text left, image right
  if (layout === "split") {
    return (
      <div className="w-full border-b border-ui-border-base" {...sectionAttrs}>
        <div className="content-container grid grid-cols-1 small:grid-cols-2 min-h-[75vh]">
          <div className="flex flex-col justify-center py-16 small:py-24 gap-6">
            <HeroContent
              badgeText={badgeText}
              title={title}
              subtitle={subtitle}
              description={description}
              ctaText={ctaText}
              ctaLink={ctaLink}
              secondaryCtaText={secondaryCtaText}
              secondaryCtaLink={secondaryCtaLink}
              align="left"
            />
          </div>
          <div className="relative hidden small:block">
            {bgImage ? (
              <img
                src={bgImage}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-ui-bg-subtle" />
            )}
          </div>
        </div>
        {features && features.length > 0 && (
          <FeaturesBar features={features} />
        )}
      </div>
    )
  }

  // Center / Left / Right layouts
  const alignmentClasses = {
    center: "items-center text-center",
    left: "items-start text-left",
    right: "items-end text-right",
  }

  return (
    <div className="w-full border-b border-ui-border-base" {...sectionAttrs}>
      <div
        className="h-[75vh] w-full relative bg-ui-bg-subtle"
        style={
          bgImage
            ? {
                backgroundImage: `url(${bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {/* Dark overlay */}
        {(bgImage && overlayOpacity > 0 || isThemeEditor) && (
          <div
            className="absolute inset-0 bg-black z-[1]"
            data-theme-el="overlay"
            style={{ opacity: overlayOpacity / 100 }}
          />
        )}

        <div
          className={`absolute inset-0 z-10 flex flex-col justify-center ${alignmentClasses[layout]} px-8 small:px-32 gap-6`}
        >
          <HeroContent
            badgeText={badgeText}
            title={title}
            subtitle={subtitle}
            description={description}
            ctaText={ctaText}
            ctaLink={ctaLink}
            secondaryCtaText={secondaryCtaText}
            secondaryCtaLink={secondaryCtaLink}
            align={layout}
            hasOverlay={!!bgImage && overlayOpacity > 0}
          />
        </div>
      </div>
      {features && features.length > 0 && (
        <FeaturesBar features={features} />
      )}
    </div>
  )
}

function HeroContent({
  badgeText,
  title,
  subtitle,
  description,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
  align,
  hasOverlay,
}: {
  badgeText?: string
  title: string
  subtitle: string
  description?: string
  ctaText?: string
  ctaLink: string
  secondaryCtaText?: string
  secondaryCtaLink: string
  align: "center" | "left" | "right"
  hasOverlay?: boolean
}) {
  const textColor = hasOverlay ? "text-white" : "text-ui-fg-base"
  const subtitleColor = hasOverlay ? "text-white/80" : "text-ui-fg-subtle"

  return (
    <>
      <span
        data-theme-el="badge"
        className="inline-block px-3 py-1 rounded-full bg-theme-primary/10 text-theme-primary text-xs font-medium uppercase tracking-wider w-fit"
        style={badgeText ? undefined : { display: "none" }}
      >
        {badgeText || ""}
      </span>
      <span>
        <Heading
          level="h1"
          className={`text-3xl small:text-5xl leading-tight ${textColor} font-normal`}
        >
          {title}
        </Heading>
        <Heading
          level="h2"
          className={`text-xl small:text-3xl leading-10 ${subtitleColor} font-normal mt-2`}
        >
          {subtitle}
        </Heading>
      </span>
      <Text
        data-theme-el="description"
        className={`max-w-lg text-base ${subtitleColor} ${
          align === "center" ? "mx-auto" : ""
        }`}
        style={description ? undefined : { display: "none" }}
      >
        {description || ""}
      </Text>
      <div
        className={`flex gap-4 ${
          align === "center"
            ? "justify-center"
            : align === "right"
              ? "justify-end"
              : "justify-start"
        }`}
      >
        <LocalizedClientLink
          href={ctaLink}
          data-theme-el="cta"
          className="inline-block px-6 py-3 bg-theme-primary text-white rounded-md hover:opacity-90 transition-opacity font-medium"
          style={ctaText ? undefined : { display: "none" }}
        >
          {ctaText || ""}
        </LocalizedClientLink>
        <LocalizedClientLink
          href={secondaryCtaLink}
          data-theme-el="secondary-cta"
          className={`inline-block px-6 py-3 rounded-md border transition-colors font-medium ${
            hasOverlay
              ? "border-white/50 text-white hover:bg-white/10"
              : "border-ui-border-base text-ui-fg-base hover:bg-ui-bg-subtle-hover"
          }`}
          style={secondaryCtaText ? undefined : { display: "none" }}
        >
          {secondaryCtaText || ""}
        </LocalizedClientLink>
      </div>
    </>
  )
}

function FeaturesBar({
  features,
}: {
  features: Array<{ icon?: string; title: string; description?: string }>
}) {
  return (
    <div className="border-t border-ui-border-base bg-white">
      <div className="content-container py-8">
        <div
          className={`grid gap-8 ${
            features.length === 2
              ? "grid-cols-1 small:grid-cols-2"
              : features.length === 3
                ? "grid-cols-1 small:grid-cols-3"
                : "grid-cols-1 small:grid-cols-2 medium:grid-cols-4"
          }`}
        >
          {features.map((feat, i) => (
            <div key={i} className="flex items-start gap-3">
              {feat.icon && (
                <span className="text-2xl flex-shrink-0">{feat.icon}</span>
              )}
              <div>
                <Text className="font-medium text-ui-fg-base">
                  {feat.title}
                </Text>
                {feat.description && (
                  <Text className="text-sm text-ui-fg-subtle mt-0.5">
                    {feat.description}
                  </Text>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Hero
