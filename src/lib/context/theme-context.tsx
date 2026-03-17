"use client"

import { createContext, useContext, ReactNode } from "react"
import { WebsiteTheme } from "@lib/data/website"

const ThemeContext = createContext<WebsiteTheme>({})

export const ThemeProvider = ({
  theme,
  children,
}: {
  theme: WebsiteTheme
  children: ReactNode
}) => {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
