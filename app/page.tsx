"use client"

import { useState } from "react"
import { SFTPConfigForm } from "@/components/sftp-config-form"
import { FileUpload } from "@/components/file-upload"
import { ImageGallery } from "@/components/image-gallery"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SFTPConfig } from "@/lib/types"
import { Server, Upload, Images } from "lucide-react"

export default function Home() {
  const [sftpConfig, setSftpConfig] = useState<SFTPConfig | null>(null)
  const [refreshGallery, setRefreshGallery] = useState(0)

  const handleConfigSaved = (config: SFTPConfig) => {
    setSftpConfig(config)
  }

  const handleUploadComplete = () => {
    setRefreshGallery((prev) => prev + 1)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-balance">Cliente SFTP Web</h1>
          <p className="text-muted-foreground text-pretty">
            Sube y gestiona archivos en tu servidor SFTP de forma segura
          </p>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">Configuración</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2" disabled={!sftpConfig}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Subir</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2" disabled={!sftpConfig}>
              <Images className="h-4 w-4" />
              <span className="hidden sm:inline">Galería</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <SFTPConfigForm onConfigSaved={handleConfigSaved} initialConfig={sftpConfig || undefined} />
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            {sftpConfig ? (
              <FileUpload sftpConfig={sftpConfig} onUploadComplete={handleUploadComplete} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Configura primero tu servidor SFTP en la pestaña de Configuración
              </div>
            )}
          </TabsContent>

          <TabsContent value="gallery" className="space-y-4">
            {sftpConfig ? (
              <ImageGallery key={refreshGallery} sftpConfig={sftpConfig} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Configura primero tu servidor SFTP en la pestaña de Configuración
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
