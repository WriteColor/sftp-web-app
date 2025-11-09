"use client"

import { useState, useEffect } from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Theme = "light" | "dark" | "system"

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("system")
  const [mounted, setMounted] = useState(false)

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true)

    // Get saved theme or default to system
    const savedTheme = localStorage.getItem("theme") as Theme | null
    const initialTheme = savedTheme || "system"
    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    if (newTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      document.documentElement.classList.toggle("dark", isDark)
    } else {
      document.documentElement.classList.toggle("dark", newTheme === "dark")
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    applyTheme(newTheme)
  }

  // Listen to system theme changes
  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system")
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme, mounted])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <div className="h-4 w-4" />
      </Button>
    )
  }

  const isDarkMode = document.documentElement.classList.contains("dark")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative transition-colors duration-200 bg-transparent">
          {theme === "light" && <Sun className={`h-4 w-4 ${isDarkMode ? "text-white" : "text-black"}`} />}
          {theme === "dark" && <Moon className={`h-4 w-4 ${isDarkMode ? "text-white" : "text-black"}`} />}
          {theme === "system" && <Monitor className={`h-4 w-4 ${isDarkMode ? "text-white" : "text-black"}`} />}
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange("light")} className="flex items-center gap-2">
          <Sun className={`h-4 w-4 ${isDarkMode ? "text-white" : "text-black"}`} />
          <span>Claro</span>
          {theme === "light" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")} className="flex items-center gap-2">
          <Moon className={`h-4 w-4 ${isDarkMode ? "text-white" : "text-black"}`} />
          <span>Oscuro</span>
          {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")} className="flex items-center gap-2">
          <Monitor className={`h-4 w-4 ${isDarkMode ? "text-white" : "text-black"}`} />
          <span>Sistema</span>
          {theme === "system" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
