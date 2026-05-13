"use client"

import { useEffect, useCallback } from "react"

type ThemeEditorMessage =
  | { type: "THEME_EDITOR_INIT" }
  | {
      type: "UPDATE_THEME_PREVIEW"
      section:
        | "colors"
        | "branding"
        | "hero"
        | "navigation"
        | "footer"
        | "animations"
        | "typography"
        | "buttons"
        | "trust_banner"
        | "text_with_image"
        | "testimonials"
        | "banner"
        | "newsletter"
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
    if (data.secondary) root.style.setProperty("--theme-secondary", data.secondary as string)
    if (data.background) root.style.setProperty("--theme-background", data.background as string)
    if (data.text) root.style.setProperty("--theme-text", data.text as string)
    if (data.accent) root.style.setProperty("--theme-accent", data.accent as string)
    if (data.muted) root.style.setProperty("--theme-muted", data.muted as string)
    if (data.border) root.style.setProperty("--theme-border", data.border as string)
  }, [])

  const updateButtons = useCallback((data: Record<string, unknown>) => {
    const root = document.documentElement
    if (data.border_radius !== undefined) {
      root.style.setProperty(
        "--theme-button-radius",
        (data.border_radius as string) || "0px"
      )
    }
  }, [])

  const updateNavigation = useCallback((data: Record<string, unknown>) => {
    const navSection = document.querySelector(
      "[data-theme-section='nav']"
    ) as HTMLElement | null
    if (!navSection) return

    if (data.sticky !== undefined) {
      const isSticky = Boolean(data.sticky)
      navSection.dataset.navSticky = isSticky ? "true" : "false"
      ;["sticky", "top-0", "inset-x-0", "z-50"].forEach((c) =>
        navSection.classList.toggle(c, isSticky)
      )
    }

    if (data.style !== undefined) {
      const style = (data.style as string) || "bordered"
      navSection.dataset.navStyle = style
      const header = navSection.querySelector("header") as HTMLElement | null
      if (header) {
        header.classList.toggle("bg-white", style !== "transparent")
        header.classList.toggle("border-b", style === "bordered")
        header.classList.toggle("border-ui-border-base", style === "bordered")
      }
    }

    if (data.show_cart_icon !== undefined) {
      const cartWrap = navSection.querySelector(
        "[data-nav-cart-wrapper]"
      ) as HTMLElement | null
      if (cartWrap) cartWrap.classList.toggle("hidden", !data.show_cart_icon)
    }

    if (data.show_search !== undefined) {
      const searchEl = navSection.querySelector(
        "[data-nav-search]"
      ) as HTMLElement | null
      if (searchEl) {
        searchEl.classList.toggle("hidden", !data.show_search)
        searchEl.classList.toggle("flex", Boolean(data.show_search))
      }
    }

    if (data.show_account_link !== undefined) {
      const accountEl = navSection.querySelector(
        "[data-testid='nav-account-link']"
      ) as HTMLElement | null
      if (accountEl) {
        accountEl.classList.toggle("hidden", !data.show_account_link)
      }
    }
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

    // Update favicon live so editor previews work without a reload.
    if (data.favicon_url !== undefined) {
      const href = (data.favicon_url as string) || "/favicon.ico"
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
      if (!link) {
        link = document.createElement("link")
        link.rel = "icon"
        document.head.appendChild(link)
      }
      link.href = href
    }
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

  const loadGoogleFont = useCallback((fontName: string) => {
    const SYSTEM_FONTS = ["Inter", "System UI"]
    if (SYSTEM_FONTS.includes(fontName)) return
    const id = `gfont-${fontName.replace(/\s+/g, "-").toLowerCase()}`
    if (document.getElementById(id)) return
    const link = document.createElement("link")
    link.id = id
    link.rel = "stylesheet"
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`
    document.head.appendChild(link)
  }, [])

  const updateTypography = useCallback((data: Record<string, unknown>) => {
    const root = document.documentElement
    if (data.font_family) {
      loadGoogleFont(data.font_family as string)
      root.style.setProperty("--theme-font-family", `${data.font_family}, sans-serif`)
      document.body.style.fontFamily = `${data.font_family}, sans-serif`
    }
    if (data.heading_font_family) {
      loadGoogleFont(data.heading_font_family as string)
      root.style.setProperty("--theme-heading-font-family", `${data.heading_font_family}, sans-serif`)
      document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
        ;(el as HTMLElement).style.fontFamily = `${data.heading_font_family}, sans-serif`
      })
    }
    if (data.base_font_size) {
      root.style.setProperty("--theme-base-font-size", data.base_font_size as string)
      document.body.style.fontSize = data.base_font_size as string
    }
    if (data.heading_weight) {
      root.style.setProperty("--theme-heading-weight", data.heading_weight as string)
      document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
        ;(el as HTMLElement).style.fontWeight = data.heading_weight as string
      })
    }
  }, [loadGoogleFont])

  const updateAnimations = useCallback((data: Record<string, unknown>) => {
    const root = document.documentElement
    const durationMap: Record<string, string> = { fast: "0.3s", normal: "0.6s", slow: "0.9s" }

    if (data.global_duration) {
      const dur = durationMap[data.global_duration as string] || "0.6s"
      root.style.setProperty("--theme-anim-duration", dur)
    }
    if (data.stagger_delay !== undefined) {
      root.style.setProperty("--theme-stagger-delay", `${data.stagger_delay}ms`)
    }

    // Replay hero animation on preview
    if (data.hero_entrance !== undefined) {
      const heroContent = document.querySelector("[data-theme-section='hero']")
      if (heroContent) {
        const wrapper = heroContent.querySelector("[class*='animate-theme-']") || heroContent.firstElementChild
        if (wrapper) {
          const el = wrapper as HTMLElement
          // Remove existing animation classes
          el.getAnimations().forEach((a) => a.cancel())
          el.classList.remove("opacity-0")
          ;[
            "animate-theme-fade-up", "animate-theme-fade-in", "animate-theme-fade-down",
            "animate-theme-slide-left", "animate-theme-slide-right",
            "animate-theme-zoom-in", "animate-theme-zoom-out",
          ].forEach((c) => el.classList.remove(c))

          const animType = data.hero_entrance as string
          if (animType && animType !== "none") {
            // Force reflow then apply new animation
            el.classList.add("opacity-0")
            void el.offsetHeight
            el.classList.remove("opacity-0")
            el.classList.add(`animate-theme-${animType}`)
          }
        }
      }
    }

    // Replay background image animation
    if (data.bg_animation !== undefined) {
      const heroSection = document.querySelector("[data-theme-section='hero']")
      const bgEl = heroSection?.querySelector("[data-theme-el='hero-bg']") as HTMLElement | null
      if (bgEl) {
        bgEl.getAnimations().forEach((a) => a.cancel())
        ;[
          "animate-theme-bg-ken-burns", "animate-theme-bg-zoom-in",
          "animate-theme-bg-fade-in", "animate-theme-bg-pan-left",
          "animate-theme-bg-pan-right",
        ].forEach((c) => bgEl.classList.remove(c))

        const bgAnimType = data.bg_animation as string
        if (bgAnimType && bgAnimType !== "none") {
          void bgEl.offsetHeight
          bgEl.classList.add(`animate-theme-bg-${bgAnimType}`)
        }
      }
    }
  }, [])

  const updateSectionText = useCallback(
    (sectionName: string, data: Record<string, unknown>) => {
      const section = document.querySelector(
        `[data-theme-section='${sectionName}']`
      )
      if (!section) return

      // Update text content by matching data-theme-el attributes or common elements
      if (data.title !== undefined) {
        const h2 = section.querySelector("h2")
        if (h2) h2.textContent = data.title as string
      }
      if (data.heading !== undefined) {
        const h2 = section.querySelector("h2")
        if (h2) h2.textContent = data.heading as string
      }
      if (data.description !== undefined) {
        const p = section.querySelector("p")
        if (p) p.textContent = data.description as string
      }
    },
    []
  )

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
          case "buttons":
            updateButtons(msg.data)
            break
          case "navigation":
            updateNavigation(msg.data)
            break
          case "hero":
            updateHero(msg.data)
            break
          case "footer":
            updateFooter(msg.data)
            break
          case "animations":
            updateAnimations(msg.data)
            break
          case "typography":
            updateTypography(msg.data)
            break
          case "trust_banner":
          case "text_with_image":
          case "testimonials":
          case "banner":
          case "newsletter":
            updateSectionText(msg.section, msg.data)
            break
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [updateColors, updateBranding, updateButtons, updateNavigation, updateHero, updateFooter, updateAnimations, updateTypography, updateSectionText])

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
