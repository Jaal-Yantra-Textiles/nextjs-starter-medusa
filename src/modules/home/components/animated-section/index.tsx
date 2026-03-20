"use client"

import { ReactNode } from "react"
import { useScrollAnimation } from "@lib/hooks/use-scroll-animation"
import { AnimationType } from "@lib/data/website"

/**
 * Wraps any section with scroll-triggered entrance animation.
 * Respects theme animation settings and prefers-reduced-motion.
 */
export default function AnimatedSection({
  children,
  animation,
  delay,
  className: extraClassName,
  ...props
}: {
  children: ReactNode
  animation?: AnimationType
  delay?: number
  className?: string
  [key: string]: unknown
}) {
  const { ref, className: animClass } = useScrollAnimation(animation, {
    delay,
  })

  if (!animation || animation === "none") {
    return (
      <div className={extraClassName} {...props}>
        {children}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`${animClass} ${extraClassName || ""}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
