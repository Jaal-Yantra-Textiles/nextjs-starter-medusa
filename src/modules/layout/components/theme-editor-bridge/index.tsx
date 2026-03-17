"use client"

import { useEffect, useCallback } from "react"

type ThemeEditorMessage =
  | { type: "THEME_EDITOR_INIT" }
  | {
      type: "UPDATE_THEME_PREVIEW"
      section: "colors" | "branding" | "hero" | "navigation" | "footer"
      data: Record<string, unknown>
    }

type BridgeToParentMessage =
  | { type: "THEME_EDITOR_READY" }
  | { type: "THEME_SECTION_CLICKED"; section: string }

function sendToParent(message: BridgeToParentMessage) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, "*")
  }
}

export default function ThemeEditorBridge() {
  const updateColors = useCallback((data: Record<string, unknown>) => {
    const root = document.documentElement
    if (data.primary) root.style.setProperty("--theme-primary", data.primary as string)
    if (data.background) root.style.setProperty("--theme-background", data.background as string)
    if (data.text) root.style.setProperty("--theme-text", data.text as string)
    if (data.accent) root.style.setProperty("--theme-accent", data.accent as string)
  }, [])

  const updateBranding = useCallback((data: Record<string, unknown>) => {
    const navLink = document.querySelector("[data-testid='nav-store-link']")
    if (navLink) {
      if (data.logo_url) {
        const img = navLink.querySelector("img")
        if (img) {
          img.src = data.logo_url as string
          img.alt = (data.store_name as string) || ""
        } else if (data.store_name) {
          navLink.textContent = data.store_name as string
        }
      } else if (data.store_name) {
        navLink.textContent = data.store_name as string
      }
    }

    // Update footer store name
    const footerLinks = document.querySelectorAll("footer a")
    footerLinks.forEach((link) => {
      if (link.getAttribute("href")?.endsWith("/") && data.store_name) {
        link.textContent = data.store_name as string
      }
    })
  }, [])

  const updateHero = useCallback((data: Record<string, unknown>) => {
    const hero = document.querySelector("[data-theme-section='hero']")
    if (!hero) return

    if (data.title !== undefined) {
      const h1 = hero.querySelector("h1")
      if (h1) h1.textContent = data.title as string
    }
    if (data.subtitle !== undefined) {
      const h2 = hero.querySelector("h2")
      if (h2) h2.textContent = data.subtitle as string
    }
    if (data.description !== undefined) {
      const desc = hero.querySelector("[data-theme-el='description']")
      if (desc) desc.textContent = data.description as string
    }
    if (data.badge_text !== undefined) {
      const badge = hero.querySelector("[data-theme-el='badge']")
      if (badge) {
        badge.textContent = data.badge_text as string
        ;(badge as HTMLElement).style.display = data.badge_text ? "" : "none"
      }
    }
    if (data.cta_text !== undefined) {
      const cta = hero.querySelector("[data-theme-el='cta']")
      if (cta) {
        cta.textContent = data.cta_text as string
        ;(cta as HTMLElement).style.display = data.cta_text ? "" : "none"
      }
    }
    if (data.secondary_cta_text !== undefined) {
      const scta = hero.querySelector("[data-theme-el='secondary-cta']")
      if (scta) {
        scta.textContent = data.secondary_cta_text as string
        ;(scta as HTMLElement).style.display = data.secondary_cta_text ? "" : "none"
      }
    }
    if (data.background_image_url !== undefined) {
      const url = data.background_image_url as string
      ;(hero as HTMLElement).style.backgroundImage = url ? `url(${url})` : ""
      ;(hero as HTMLElement).style.backgroundSize = url ? "cover" : ""
      ;(hero as HTMLElement).style.backgroundPosition = url ? "center" : ""
    }
    if (data.overlay_opacity !== undefined) {
      const overlay = hero.querySelector("[data-theme-el='overlay']") as HTMLElement
      if (overlay) {
        overlay.style.opacity = String(Number(data.overlay_opacity) / 100)
      }
    }
  }, [])

  const updateFooter = useCallback((data: Record<string, unknown>) => {
    if (data.text !== undefined) {
      const footerText = document.querySelector("[data-theme-section='footer-text']")
      if (footerText) {
        const storeName = footerText.textContent?.split(".")[0] || ""
        footerText.textContent = `${storeName}. ${data.text || "All rights reserved."}`
      }
    }
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ThemeEditorMessage>) => {
      const msg = event.data
      if (!msg || typeof msg !== "object" || !("type" in msg)) return

      if (msg.type === "THEME_EDITOR_INIT") {
        sendToParent({ type: "THEME_EDITOR_READY" })
        return
      }

      if (msg.type === "UPDATE_THEME_PREVIEW") {
        switch (msg.section) {
          case "colors":
            updateColors(msg.data)
            break
          case "branding":
            updateBranding(msg.data)
            break
          case "hero":
            updateHero(msg.data)
            break
          case "footer":
            updateFooter(msg.data)
            break
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [updateColors, updateBranding, updateHero, updateFooter])

  // Inject editor outline styles for sections
  useEffect(() => {
    const style = document.createElement("style")
    style.id = "theme-editor-styles"
    style.textContent = `
      [data-theme-section] {
        transition: outline 0.15s ease;
      }
      [data-theme-section]:hover {
        outline: 2px dashed rgba(124, 58, 237, 0.4);
        outline-offset: 2px;
        cursor: pointer;
      }
      [data-theme-section].te-selected {
        outline: 2px solid rgb(124, 58, 237) !important;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
      }
    `
    document.head.appendChild(style)

    // Click handler for section selection
    const handleClick = (e: MouseEvent) => {
      const sectionEl = (e.target as HTMLElement).closest("[data-theme-section]") as HTMLElement | null
      if (!sectionEl) return

      e.preventDefault()
      e.stopPropagation()

      document.querySelectorAll("[data-theme-section]").forEach((el) =>
        el.classList.remove("te-selected")
      )
      sectionEl.classList.add("te-selected")

      sendToParent({
        type: "THEME_SECTION_CLICKED",
        section: sectionEl.dataset.themeSection!,
      })
    }

    // Disable navigation in editor mode
    const handleLinkClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a")
      if (link) {
        const href = link.getAttribute("href")
        if (href && href !== "#" && !href.startsWith("javascript:")) {
          e.preventDefault()
        }
      }
    }

    document.addEventListener("click", handleClick, true)
    document.addEventListener("click", handleLinkClick, true)

    return () => {
      style.remove()
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("click", handleLinkClick, true)
    }
  }, [])

  // Send ready signal
  useEffect(() => {
    const timer = setTimeout(() => {
      sendToParent({ type: "THEME_EDITOR_READY" })
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return null
}
