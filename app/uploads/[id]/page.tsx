"use client"

import { useState, useEffect, use } from "react"
import { SFTPConnectionButton } from "@/components/common/sftp-connection-button"
import { FileUpload } from "@/components/common/file-upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft } from "lucide-react"
import type { SFTPConfig, UploadBatch, FileMetadataWithStatus } from "@/lib/types"
import { toast, Toaster } from "sonner"
import Link from "next/link"

export default function UploadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [upload, setUpload] = useState<UploadBatch | null>(null)
  const [files, setFiles] = useState<FileMetadataWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Configuración SFTP (se completa en el servidor con las variables de entorno)
  const sftpConfig: SFTPConfig = {
    host: process.env.NEXT_PUBLIC_SFTP_HOST || "",
    port: parseInt(process.env.NEXT_PUBLIC_SFTP_PORT || "22"),
    username: process.env.NEXT_PUBLIC_SFTP_USERNAME || "",
    password: process.env.NEXT_PUBLIC_SFTP_PASSWORD || "", // Se completa en el servidor
  }

  const loadUploadData = async () => {
    setLoading(true)
    try {
      const [uploadRes, filesRes] = await Promise.all([
        fetch(`/api/upload-batches/${resolvedParams.id}`),
        fetch(`/api/sftp/files?uploadBatchId=${resolvedParams.id}`),
      ])

      const uploadData = await uploadRes.json()
      const filesData = await filesRes.json()

      if (uploadData.success) {
        setUpload(uploadData.batch)
      } else {
        toast.error("Error al cargar registro")
      }

      if (filesData.success) {
        setFiles(filesData.files.map((f: any) => ({ ...f, status: "uploaded" as const })))
      }
    } catch (err) {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUploadData()
  }, [resolvedParams.id, refreshKey])

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected)
  }

  const handleUploadComplete = () => {
    setRefreshKey((prev) => prev + 1)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </main>
    )
  }

  if (!upload) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Registro no encontrado</p>
              <Button asChild className="mt-4">
                <Link href="/uploads">Volver a registros</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <>
      <Toaster position="top-right" richColors closeButton />

      <main className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/uploads">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a registros
            </Link>
          </Button>

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-balance">{upload.name}</h1>
            <p className="text-muted-foreground text-pretty">{files.length} archivo(s) en este registro</p>
          </div>

          <div className="space-y-6">
            {/* Botón de conexión simple */}
            <SFTPConnectionButton onConnected={handleConnectionChange} />

            {/* Componente de subida solo se muestra cuando está conectado */}
            {isConnected ? (
              <FileUpload
                sftpConfig={sftpConfig}
                onUploadComplete={handleUploadComplete}
                uploadBatchId={resolvedParams.id}
                existingFiles={files}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Conexión requerida</CardTitle>
                  <CardDescription>
                    Conéctate al servidor SFTP para gestionar archivos en este registro
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
