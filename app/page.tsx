"use client"

import { useState } from "react"
import { SFTPConnectionButton } from "@/components/sftp-connection-button"
import { FileUpload } from "@/components/file-upload"
import { ImageGallery } from "@/components/image-gallery"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SFTPConfig } from "@/lib/types"
import { Upload, Images, FolderOpen } from "lucide-react"
import { Toaster } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [refreshGallery, setRefreshGallery] = useState(0)

  // Configuración SFTP (solo información de visualización, no se usa la contraseña)
  // La autenticación real se hace en el servidor con las variables de entorno
  const sftpConfig: SFTPConfig = {
    host: process.env.NEXT_PUBLIC_SFTP_HOST || "access-5017844927.webspace-host.com",
    port: parseInt(process.env.NEXT_PUBLIC_SFTP_PORT || "22"),
    username: process.env.NEXT_PUBLIC_SFTP_USERNAME || "a999815",
    password: "", // Se completa en el servidor
  }

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected)
  }

  const handleUploadComplete = () => {
    setRefreshGallery((prev) => prev + 1)
  }

  return (
    <>
      <Toaster position="top-right" richColors closeButton />

      <main className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-balance">Cliente SFTP Web</h1>
              <p className="text-muted-foreground text-pretty">
                Sube y gestiona archivos en tu servidor SFTP de forma segura
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/uploads">
                <FolderOpen className="mr-2 h-4 w-4" />
                Registros de Subida
              </Link>
            </Button>
          </div>

          <div className="space-y-6">
            {/* Botón de conexión simple */}
            <SFTPConnectionButton onConnected={handleConnectionChange} />

            {/* Tabs solo se muestran cuando está conectado */}
            {isConnected && (
              <Tabs defaultValue="upload" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Subir Archivos</span>
                  </TabsTrigger>
                  <TabsTrigger value="gallery" className="flex items-center gap-2">
                    <Images className="h-4 w-4" />
                    <span className="hidden sm:inline">Galería</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <FileUpload sftpConfig={sftpConfig} onUploadComplete={handleUploadComplete} />
                </TabsContent>

                <TabsContent value="gallery" className="space-y-4">
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
