"use client"

import { ReactNode, useEffect, useRef, useState } from "react"
import { AnimationType } from "@lib/data/website"

const ANIMATION_CLASS_MAP: Record<string, string> = {
  "fade-up": "animate-theme-fade-up",
  "fade-in": "animate-theme-fade-in",
  "fade-down": "animate-theme-fade-down",
  "slide-left": "animate-theme-slide-left",
  "slide-right": "animate-theme-slide-right",
  "zoom-in": "animate-theme-zoom-in",
  "zoom-out": "animate-theme-zoom-out",
}

/**
 * Client component that handles hero entrance animation on mount.
 * Hero is always above the fold, so we trigger on mount instead of scroll.
 */
export default function HeroAnimationWrapper({
  children,
  animation,
  className,
}: {
  children: ReactNode
  animation?: AnimationType
  className?: string
}) {
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animation || animation === "none") {
      setMounted(true)
      return
    }

    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMounted(true)
      return
    }

    // Small delay so the initial opacity-0 renders first
    requestAnimationFrame(() => {
      setMounted(true)
    })
  }, [animation])

  if (!animation || animation === "none") {
    return <div className={className}>{children}</div>
  }

  const animClass = mounted ? ANIMATION_CLASS_MAP[animation] || "" : "opacity-0"

  return (
    <div ref={ref} className={`${animClass} ${className || ""}`.trim()}>
      {children}
    </div>
  )
}
