"use client"

import { useState } from "react"
import { SFTPConnectionButton } from "@/components/common/sftp-connection-button"
import { FileUpload } from "@/components/common/file-upload"
import { ImageGallery } from "@/components/view/image-gallery"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SFTPConfig } from "@/lib/types"
import { Upload, Images } from "lucide-react"
import { Toaster } from "sonner"

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [refreshGallery, setRefreshGallery] = useState(0)

  // Configuración SFTP (solo información de visualización, no se usa la contraseña)
  // La autenticación real se hace en el servidor con las variables de entorno
  const sftpConfig: SFTPConfig = {
    host: process.env.NEXT_PUBLIC_SFTP_HOST || "",
    port: parseInt(process.env.NEXT_PUBLIC_SFTP_PORT || "22"),
    username: process.env.NEXT_PUBLIC_SFTP_USERNAME || "",
    password: process.env.SFTP_PASSWORD || "",
  }

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected)
  }

  const handleUploadComplete = () => {
    setRefreshGallery((prev) => prev + 1)
  }

  return (
    <>
      <Toaster position="top-right" richColors />

      <main className="min-h-screen bg-linear-to-br from-background via-background to-muted/30">
        <div className="container mx-auto py-10 px-4 max-w-7xl">
          <div className="mb-10">
            <div className="flex items-start justify-between mb-6">
              <div className="space-y-2">
                <h1 className="text-5xl font-bold tracking-tight text-balance text-foreground">Cliente SFTP</h1>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  Gestiona tus archivos de forma segura. Sube, visualiza y organiza contenido en tu servidor SFTP.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Connection Button */}
            <div className="w-full">
              <SFTPConnectionButton onConnected={handleConnectionChange} />
            </div>

            {/* Tabs */}
            {isConnected && (
              <Tabs defaultValue="upload" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted p-1">
                  <TabsTrigger value="upload" className="flex items-center gap-2 rounded-md">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Subir</span>
                  </TabsTrigger>
                  <TabsTrigger value="gallery" className="flex items-center gap-2 rounded-md">
                    <Images className="h-4 w-4" />
                    <span className="hidden sm:inline">Galería</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4 mt-6">
                  <FileUpload sftpConfig={sftpConfig} onUploadComplete={handleUploadComplete} />
                </TabsContent>

                <TabsContent value="gallery" className="space-y-4 mt-6">
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
