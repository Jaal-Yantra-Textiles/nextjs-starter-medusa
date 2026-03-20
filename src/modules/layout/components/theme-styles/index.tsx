import { WebsiteTheme } from "@lib/data/website"

const DURATION_MAP: Record<string, string> = {
  fast: "0.3s",
  normal: "0.6s",
  slow: "0.9s",
}

export default function ThemeStyles({ theme }: { theme?: WebsiteTheme | null }) {
  const colors = theme?.colors
  const animations = theme?.animations
  const typography = theme?.typography

  const vars: string[] = []
  if (colors?.primary) vars.push(`--theme-primary: ${colors.primary};`)
  if (colors?.background) vars.push(`--theme-background: ${colors.background};`)
  if (colors?.text) vars.push(`--theme-text: ${colors.text};`)
  if (colors?.accent) vars.push(`--theme-accent: ${colors.accent};`)

  // Typography
  if (typography?.font_family) vars.push(`--theme-font-family: ${typography.font_family}, sans-serif;`)
  if (typography?.heading_font_family) vars.push(`--theme-heading-font-family: ${typography.heading_font_family}, sans-serif;`)
  if (typography?.base_font_size) vars.push(`--theme-base-font-size: ${typography.base_font_size};`)
  if (typography?.heading_weight) vars.push(`--theme-heading-weight: ${typography.heading_weight};`)

  // Animation duration
  const duration = DURATION_MAP[animations?.global_duration || "normal"] || "0.6s"
  vars.push(`--theme-anim-duration: ${duration};`)
  vars.push(`--theme-stagger-delay: ${animations?.stagger_delay || 100}ms;`)

  if (vars.length === 0) return null

  // Build styles: CSS variables + typography rules
  const rules: string[] = [`:root { ${vars.join(" ")} }`]

  if (typography?.font_family || typography?.base_font_size) {
    rules.push(`body { ${typography.font_family ? `font-family: var(--theme-font-family);` : ""} ${typography.base_font_size ? `font-size: var(--theme-base-font-size);` : ""} }`)
  }
  if (typography?.heading_font_family || typography?.heading_weight) {
    rules.push(`h1, h2, h3, h4, h5, h6 { ${typography.heading_font_family ? `font-family: var(--theme-heading-font-family);` : ""} ${typography.heading_weight ? `font-weight: var(--theme-heading-weight);` : ""} }`)
  }

  // Load Google Fonts for non-system fonts
  const SYSTEM_FONTS = new Set(["Inter", "System UI"])
  const fontsToLoad = new Set<string>()
  if (typography?.font_family && !SYSTEM_FONTS.has(typography.font_family)) {
    fontsToLoad.add(typography.font_family)
  }
  if (typography?.heading_font_family && !SYSTEM_FONTS.has(typography.heading_font_family)) {
    fontsToLoad.add(typography.heading_font_family)
  }

  const fontLink = fontsToLoad.size > 0
    ? `https://fonts.googleapis.com/css2?${Array.from(fontsToLoad)
        .map((f) => `family=${f.replace(/\s+/g, "+")}:wght@400;500;600;700`)
        .join("&")}&display=swap`
    : null

  return (
    <>
      {fontLink && (
        <link rel="stylesheet" href={fontLink} />
      )}
      <style
        dangerouslySetInnerHTML={{
          __html: rules.join("\n"),
        }}
      />
    </>
  )
}
