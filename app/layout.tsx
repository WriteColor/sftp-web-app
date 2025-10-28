import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Cliente SFTP Web - Gestión Segura de Archivos",
  description: "Aplicación web para subir, gestionar y visualizar archivos en servidores SFTP de forma segura",
  generator: "v0.app",
  keywords: ["SFTP", "file upload", "file management", "secure transfer"],
  robots: "noindex, nofollow", // Cambiar en producción si es necesario
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
