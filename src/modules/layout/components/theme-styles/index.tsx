import { WebsiteTheme } from "@lib/data/website"

export default function ThemeStyles({ theme }: { theme?: WebsiteTheme | null }) {
  const colors = theme?.colors
  if (!colors?.primary && !colors?.background && !colors?.text && !colors?.accent) {
    return null
  }

  const vars: string[] = []
  if (colors.primary) vars.push(`--theme-primary: ${colors.primary};`)
  if (colors.background) vars.push(`--theme-background: ${colors.background};`)
  if (colors.text) vars.push(`--theme-text: ${colors.text};`)
  if (colors.accent) vars.push(`--theme-accent: ${colors.accent};`)

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root { ${vars.join(" ")} }`,
      }}
    />
  )
}
