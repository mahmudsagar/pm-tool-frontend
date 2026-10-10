import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type Theme = "dark" | "light" | "system"
type ResolvedTheme = "dark" | "light"

interface ThemeContextValue {
  theme: Theme
  /** The theme actually applied, with "system" resolved from the OS preference. */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeContextValue | undefined>(undefined)

const systemTheme = (): ResolvedTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

function readStoredTheme(key: string, fallback: Theme): Theme {
  try {
    const stored = localStorage.getItem(key)
    return stored === "dark" || stored === "light" || stored === "system" ? stored : fallback
  } catch {
    return fallback
  }
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({ children, defaultTheme = "dark", storageKey = "vite-ui-theme" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(storageKey, defaultTheme))
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme)

  // Follow OS changes while in "system" mode.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setSystem(media.matches ? "dark" : "light")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  const resolvedTheme = theme === "system" ? system : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // Storage may be unavailable (private mode); the choice still applies for this session.
    }
    setThemeState(next)
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (!context) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
