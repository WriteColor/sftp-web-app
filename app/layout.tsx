import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "@/styles/globals.css"
import { ThemeSwitcher } from "@/components/common/theme-switcher"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  icons: "/favicon.ico",
  title: "Cliente SFTP - Write_Color",
  description: "Aplicación web para subir, gestionar y visualizar archivos en servidores SFTP de forma segura",
  keywords: ["SFTP", "file upload", "file management", "secure transfer"],
  robots: "noindex, nofollow",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'system';
                const isDark = theme === 'dark' || 
                  (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.classList.add('dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`font-sans antialiased`}>
        <header className="border-b bg-background sticky top-0 z-40">
          <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between h-16">
            <div />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" asChild>
                <a 
                  href="https://github.com/WriteColor/sftp-web-app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Ver proyecto en GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
              </Button>
              <ThemeSwitcher />
            </div>
          </div>
        </header>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
