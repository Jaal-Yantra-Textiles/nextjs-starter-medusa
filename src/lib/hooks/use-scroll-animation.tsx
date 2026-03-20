"use client"

import { useEffect, useRef, useState } from "react"

type AnimationType =
  | "none"
  | "fade-up"
  | "fade-in"
  | "fade-down"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "zoom-out"

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
 * Hook that triggers a CSS animation when an element scrolls into view.
 * Uses IntersectionObserver for performance.
 *
 * @param animation - The animation type to apply
 * @param options - threshold (0-1), delay (ms), once (trigger only first time)
 */
export function useScrollAnimation(
  animation: AnimationType | undefined,
  options?: {
    threshold?: number
    delay?: number
    once?: boolean
  }
) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const hasAnimated = useRef(false)

  const { threshold = 0.15, delay = 0, once = true } = options || {}

  useEffect(() => {
    const el = ref.current
    if (!el || !animation || animation === "none") return

    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (once && hasAnimated.current) return
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true)
              hasAnimated.current = true
            }, delay)
          } else {
            setIsVisible(true)
            hasAnimated.current = true
          }
          if (once) observer.unobserve(el)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [animation, threshold, delay, once])

  const animationClass =
    animation && animation !== "none" ? ANIMATION_CLASS_MAP[animation] : ""

  return {
    ref,
    className: isVisible ? animationClass : "opacity-0",
    isVisible,
  }
}
