"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Download, Trash2, RefreshCw, ImageIcon } from "lucide-react"
import type { FileMetadata, SFTPConfig } from "@/lib/types"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ImageGalleryProps {
  sftpConfig: SFTPConfig
}

export function ImageGallery({ sftpConfig }: ImageGalleryProps) {
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<FileMetadata | null>(null)

  const loadFiles = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/sftp/files")
      const data = await response.json()

      if (data.success) {
        setFiles(data.files || [])
      } else {
        setError(data.message || "Error al cargar archivos")
      }
    } catch (err) {
      setError("Error al cargar la lista de archivos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  const handleDelete = async (fileId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este archivo?")) return

    try {
      const response = await fetch(`/api/sftp/files/${fileId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: sftpConfig }),
      })

      const data = await response.json()

      if (data.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId))
      } else {
        alert(data.message || "Error al eliminar archivo")
      }
    } catch (err) {
      alert("Error al eliminar archivo")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isImage = (mimeType: string) => {
    return mimeType.startsWith("image/")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Galería de Archivos</CardTitle>
            <CardDescription>{files.length} archivo(s) almacenado(s)</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={loadFiles}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {files.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No hay archivos subidos aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file) => (
              <div key={file.id} className="group relative border rounded-lg overflow-hidden bg-card">
                {isImage(file.mime_type) ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-square relative cursor-pointer overflow-hidden bg-muted">
                        <Image
                          src={`/api/sftp/serve/${file.id}`}
                          alt={file.original_filename}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{file.original_filename}</DialogTitle>
                        <DialogDescription>
                          {formatFileSize(file.file_size)} • {formatDate(file.uploaded_at || "")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="relative w-full aspect-video">
                        <Image
                          src={`/api/sftp/serve/${file.id}`}
                          alt={file.original_filename}
                          fill
                          className="object-contain"
                          sizes="(max-width: 1024px) 100vw, 80vw"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-muted">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate" title={file.original_filename}>
                    {file.original_filename}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>{formatDate(file.uploaded_at || "")}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                      <a href={`/api/sftp/serve/${file.id}?download=true`} download={file.original_filename}>
                        <Download className="h-3 w-3 mr-1" />
                        Descargar
                      </a>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(file.id!)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
