"use client"

import { useState, useEffect } from "react"
import { SFTPConnectionButton } from "@/components/common/sftp-connection-button"
import { FileUpload } from "@/components/common/file-upload"
import { ImageGallery } from "@/components/file-card/image-gallery" // Updated import path
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SFTPConfig } from "@/lib/types"
import { Upload, Images } from "lucide-react"
import { Toaster } from "sonner"
import { PageSkeleton } from "@/components/common/page-skeleton"

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [refreshGallery, setRefreshGallery] = useState(0)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  // Configuración parcial desde el cliente (sin password)
  // El servidor completará con las variables de entorno
  const sftpConfig: SFTPConfig = {
    host: process.env.NEXT_PUBLIC_SFTP_HOST || "",
    port: Number.parseInt(process.env.NEXT_PUBLIC_SFTP_PORT || "22"),
    username: process.env.NEXT_PUBLIC_SFTP_USERNAME || "",
    password: "", // Se completará en el servidor
  }

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected)
  }

  const handleUploadComplete = () => {
    setRefreshGallery((prev) => prev + 1)
  }

  // Simular carga inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false)
    }, 800) // Pequeño delay para mejor UX

    return () => clearTimeout(timer)
  }, [])

  // Mostrar skeleton durante la carga inicial
  if (isInitialLoading) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <PageSkeleton />
      </>
    )
  }

  return (
    <>
      <Toaster position="top-right" richColors />

      <main className="min-h-screen bg-linear-to-br from-background via-background to-muted/30">
        <div className="container mx-auto py-6 sm:py-8 lg:py-10 px-4 max-w-7xl">
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4 sm:mb-6">
              <div className="space-y-2 w-full">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance text-foreground">
                  Cliente SFTP - Creado por Write_Color
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                  Suban cualquier webada que quieraN, quiero ver que tienen pa compartir.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="w-full">
              <SFTPConnectionButton onConnected={handleConnectionChange} />
            </div>

            {/* Tabs */}
            {isConnected && (
              <Tabs defaultValue="upload" className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-sm sm:max-w-md bg-muted p-1">
                  <TabsTrigger
                    value="upload"
                    className="flex items-center gap-1 sm:gap-2 rounded-md text-xs sm:text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Subir</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="gallery"
                    className="flex items-center gap-1 sm:gap-2 rounded-md text-xs sm:text-sm"
                  >
                    <Images className="h-4 w-4" />
                    <span className="hidden sm:inline">Galería</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4 mt-4 sm:mt-6">
                  <FileUpload sftpConfig={sftpConfig} onUploadComplete={handleUploadComplete} />
                </TabsContent>

                <TabsContent value="gallery" className="space-y-4 mt-4 sm:mt-6">
                  <ImageGallery key={refreshGallery} sftpConfig={sftpConfig} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
