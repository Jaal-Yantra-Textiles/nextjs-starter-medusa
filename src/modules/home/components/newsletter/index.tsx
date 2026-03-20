"use client"

import { useState } from "react"
import { WebsiteTheme } from "@lib/data/website"

export default function Newsletter({
  theme,
  isThemeEditor,
}: {
  theme?: WebsiteTheme | null
  isThemeEditor?: boolean
}) {
  const config = theme?.home_sections?.newsletter
  const heading = config?.heading || "Stay in the loop"
  const description =
    config?.description ||
    "Subscribe to our newsletter for the latest updates, new arrivals, and exclusive offers."
  const placeholder = config?.placeholder || "Enter your email"
  const buttonText = config?.button_text || "Subscribe"

  const sectionAttrs = isThemeEditor ? { "data-theme-section": "newsletter" } : {}

  // Only show if configured or in editor mode
  if (!config && !isThemeEditor) return null

  return (
    <div className="w-full border-t border-ui-border-base" {...sectionAttrs}>
      <div className="content-container py-12 small:py-16">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl small:text-3xl font-semibold text-ui-fg-base mb-3">
            {heading}
          </h2>
          <p className="text-ui-fg-subtle mb-6">{description}</p>
          <NewsletterForm
            placeholder={placeholder}
            buttonText={buttonText}
            isThemeEditor={isThemeEditor}
          />
        </div>
      </div>
    </div>
  )
}

function NewsletterForm({
  placeholder,
  buttonText,
  isThemeEditor,
}: {
  placeholder: string
  buttonText: string
  isThemeEditor?: boolean
}) {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isThemeEditor) return
    if (!email) return
    // In production this would call a newsletter API
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p className="text-theme-primary font-medium py-3">
        Thanks for subscribing!
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col small:flex-row gap-3 justify-center"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        className="flex-1 max-w-sm px-4 py-3 border border-ui-border-base rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
        required
      />
      <button
        type="submit"
        className="px-6 py-3 bg-theme-primary text-white rounded-md font-medium hover:opacity-90 transition-opacity text-sm"
      >
        {buttonText}
      </button>
    </form>
  )
}
