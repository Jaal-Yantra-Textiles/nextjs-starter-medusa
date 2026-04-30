"use client"

import { useEffect } from "react"

/**
 * Reparents partner-supplied analytics HTML into real script elements.
 *
 * Why this exists: setting `<script>` markup via dangerouslySetInnerHTML
 * does NOT execute it — browsers silently skip script-from-innerHTML for
 * security. Partners paste GTM/GA/Plausible snippets that contain real
 * `<script>` tags, so we have to parse them on the client and recreate
 * each `<script>` element with document.createElement so the browser
 * actually runs them.
 *
 * `where = "head"` injects into <head>; `"body-end"` appends to <body>.
 * We track injected nodes by a data attribute so re-renders don't
 * duplicate scripts.
 */
type Props = {
  html: string
  where: "head" | "body-end"
  // Identifies this injection so re-runs don't double-inject.
  marker: string
}

export function CustomAnalyticsInjector({ html, where, marker }: Props) {
  useEffect(() => {
    if (!html) return
    if (typeof document === "undefined") return

    const target = where === "head" ? document.head : document.body
    const dataKey = `data-jyt-analytics-${marker}`

    // Bail if we've already injected for this marker
    if (target.querySelector(`[${dataKey}]`)) return

    const tmp = document.createElement("div")
    tmp.innerHTML = html

    const inserted: Element[] = []
    for (const child of Array.from(tmp.childNodes)) {
      if (child instanceof HTMLScriptElement) {
        // Recreate the script so the browser executes it
        const real = document.createElement("script")
        for (const attr of Array.from(child.attributes)) {
          real.setAttribute(attr.name, attr.value)
        }
        real.textContent = child.textContent
        real.setAttribute(dataKey, "")
        target.appendChild(real)
        inserted.push(real)
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // <noscript>, <iframe>, etc. — clone as-is
        const cloned = (child as Element).cloneNode(true) as Element
        cloned.setAttribute(dataKey, "")
        target.appendChild(cloned)
        inserted.push(cloned)
      }
      // text/comment nodes are ignored
    }

    return () => {
      for (const node of inserted) {
        if (node.parentNode === target) target.removeChild(node)
      }
    }
  }, [html, where, marker])

  return null
}
