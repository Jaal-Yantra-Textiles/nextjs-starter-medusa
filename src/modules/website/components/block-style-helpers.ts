type BlockSettings = Record<string, unknown> | undefined | null

const MAX_WIDTH_MAP: Record<string, string> = {
  default: "",
  narrow: "680px",
  medium: "960px",
  wide: "1200px",
  full: "100%",
}

export function buildBlockStyle(settings: BlockSettings): React.CSSProperties {
  if (!settings) return {}

  const styles: React.CSSProperties = {}

  const bg = settings.backgroundColor as string | undefined
  if (bg) styles.backgroundColor = bg

  const textColor = settings.textColor as string | undefined
  if (textColor) styles.color = textColor

  const padding = settings.padding as string | undefined
  if (padding) {
    if (/^\d+$/.test(padding.trim())) {
      styles.padding = `${padding}px`
    } else {
      styles.padding = padding
    }
  }

  const paddingTop = settings.paddingTop as string | undefined
  if (paddingTop) styles.paddingTop = /^\d+$/.test(paddingTop.trim()) ? `${paddingTop}px` : paddingTop
  const paddingRight = settings.paddingRight as string | undefined
  if (paddingRight) styles.paddingRight = /^\d+$/.test(paddingRight.trim()) ? `${paddingRight}px` : paddingRight
  const paddingBottom = settings.paddingBottom as string | undefined
  if (paddingBottom) styles.paddingBottom = /^\d+$/.test(paddingBottom.trim()) ? `${paddingBottom}px` : paddingBottom
  const paddingLeft = settings.paddingLeft as string | undefined
  if (paddingLeft) styles.paddingLeft = /^\d+$/.test(paddingLeft.trim()) ? `${paddingLeft}px` : paddingLeft

  const margin = settings.margin as string | undefined
  if (margin) {
    if (/^\d+$/.test(margin.trim())) {
      styles.margin = `${margin}px`
    } else {
      styles.margin = margin
    }
  }

  const marginTop = settings.marginTop as string | undefined
  if (marginTop) styles.marginTop = /^\d+$/.test(marginTop.trim()) ? `${marginTop}px` : marginTop
  const marginRight = settings.marginRight as string | undefined
  if (marginRight) styles.marginRight = /^\d+$/.test(marginRight.trim()) ? `${marginRight}px` : marginRight
  const marginBottom = settings.marginBottom as string | undefined
  if (marginBottom) styles.marginBottom = /^\d+$/.test(marginBottom.trim()) ? `${marginBottom}px` : marginBottom
  const marginLeft = settings.marginLeft as string | undefined
  if (marginLeft) styles.marginLeft = /^\d+$/.test(marginLeft.trim()) ? `${marginLeft}px` : marginLeft

  const maxW = (settings.max_width || settings.maxWidth) as string | undefined
  if (maxW && maxW !== "default") {
    styles.maxWidth = MAX_WIDTH_MAP[maxW] || maxW
  }

  const width = settings.width as string | undefined
  if (width) {
    if (/^\d+$/.test(width.trim())) {
      styles.width = `${width}px`
    } else {
      styles.width = width
    }
  }

  const height = settings.height as string | undefined
  if (height) {
    if (/^\d+$/.test(height.trim())) {
      styles.height = `${height}px`
    } else {
      styles.height = height
    }
  }

  const aspectRatio = settings.aspectRatio as string | undefined
  if (aspectRatio) styles.aspectRatio = aspectRatio

  const borderRadius = settings.borderRadius as string | undefined
  if (borderRadius) {
    if (/^\d+$/.test(borderRadius.trim())) {
      styles.borderRadius = `${borderRadius}px`
    } else {
      styles.borderRadius = borderRadius
    }
  }

  const borderWidth = settings.borderWidth as string | undefined
  const borderColor = settings.borderColor as string | undefined
  if (borderWidth || borderColor) {
    styles.border = `${borderWidth || "1"}px solid ${borderColor || "currentColor"}`
  }

  const boxShadow = settings.boxShadow as string | undefined
  if (boxShadow) styles.boxShadow = boxShadow

  return styles
}

const SPAN_CLASS_MAP: Record<string, string> = {
  "1": "col-span-1",
  "2": "col-span-2",
  "3": "col-span-3",
  "4": "col-span-4",
}

const ROW_SPAN_MAP: Record<string, string> = {
  "1": "row-span-1",
  "2": "row-span-2",
  "3": "row-span-3",
  "4": "row-span-4",
}

export function bentoSpanClass(colSpan?: string, rowSpan?: string): string {
  const parts: string[] = []
  if (colSpan && SPAN_CLASS_MAP[colSpan]) parts.push(SPAN_CLASS_MAP[colSpan])
  if (rowSpan && ROW_SPAN_MAP[rowSpan]) parts.push(ROW_SPAN_MAP[rowSpan])
  return parts.join(" ")
}
