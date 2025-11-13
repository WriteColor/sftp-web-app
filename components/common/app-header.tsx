"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { ThemeSwitcher } from "@/components/common/theme-switcher"
import { Skeleton } from "@/components/ui/skeleton"

export function AppHeader() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simular carga del header
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 max-w-7xl flex items-center justify-between h-14 sm:h-16">
          <div />
          <div className="flex items-center gap-1 sm:gap-2">
            {/* GitHub button skeleton */}
            <Skeleton className="h-9 w-9 rounded-md bg-muted/70 animate-pulse" />
            {/* Theme switcher skeleton */}
            <Skeleton className="h-9 w-9 rounded-md bg-muted/70 animate-pulse" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container mx-auto px-3 sm:px-4 max-w-7xl flex items-center justify-between h-14 sm:h-16">
        <div />
        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            asChild
            className="transition-all hover:scale-105 "
          >
            <a 
              href="https://github.com/WriteColor/sftp-web-app" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="Ver proyecto en GitHub"
            >
              <ExternalLink className="h-4 w-4 dark:stroke-white" />
            </a>
          </Button>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  )
}
