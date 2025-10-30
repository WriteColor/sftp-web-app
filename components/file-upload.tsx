"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, X, FileIcon, Loader2 } from "lucide-react"
import type { SFTPConfig, FileMetadataWithStatus } from "@/lib/types"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { ImageZoomViewer } from "./image-zoom-viewer"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_FILES = 20

interface FileWithPreview extends File {
  preview?: string
}

interface FileUploadProps {
  sftpConfig: SFTPConfig
  onUploadComplete: () => void
  uploadBatchId?: string
  existingFiles?: FileMetadataWithStatus[]
}

export function FileUpload({ sftpConfig, onUploadComplete, uploadBatchId, existingFiles = [] }: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Validar cantidad total de archivos (existentes + nuevos + seleccionados)
      const totalFiles = existingFiles.length + files.length + acceptedFiles.length
      if (totalFiles > MAX_FILES) {
        toast.error(`Límite alcanzado`, {
          description: `Solo puedes tener un máximo de ${MAX_FILES} archivos. Actualmente tienes ${existingFiles.length + files.length} archivo(s).`,
        })
        return
      }

      // Validar tamaño de archivos
      const oversizedFiles = acceptedFiles.filter((file) => file.size > MAX_FILE_SIZE)
      if (oversizedFiles.length > 0) {
        toast.error("Archivos demasiado grandes", {
          description: `${oversizedFiles.length} archivo(s) exceden el tamaño máximo de 50MB`,
        })
        return
      }

      // Mostrar errores de archivos rechazados
      if (rejectedFiles.length > 0) {
        toast.warning("Algunos archivos no se pudieron agregar", {
          description: `${rejectedFiles.length} archivo(s) fueron rechazados`,
        })
      }

      // Agregar previews para imágenes
      const filesWithPreviews = acceptedFiles.map((file) => {
        if (file.type.startsWith("image/")) {
          return Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        }
        return file
      })

      setFiles((prev) => [...prev, ...filesWithPreviews])
      toast.success(`${acceptedFiles.length} archivo(s) agregado(s)`)
    },
    [files.length, existingFiles.length],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: MAX_FILES,
    maxSize: MAX_FILE_SIZE,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
    toast.info("Archivo eliminado de la lista")
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })
      formData.append("config", JSON.stringify(sftpConfig))
      if (uploadBatchId) {
        formData.append("uploadBatchId", uploadBatchId)
      }

      const response = await fetch("/api/sftp/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Subida exitosa", {
          description: `${data.files?.length || 0} archivo(s) subido(s) correctamente`,
        })
        setFiles([])
        onUploadComplete()
      } else {
        toast.error("Error al subir archivos", {
          description: data.message || "Ocurrió un error durante la subida",
        })
      }
    } catch (error) {
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor",
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteExisting = async (fileId: string) => {
    try {
      const response = await fetch(`/api/sftp/files/${fileId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: sftpConfig }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Archivo eliminado del servidor")
        onUploadComplete()
      } else {
        toast.error("Error al eliminar", {
          description: data.message || "No se pudo eliminar el archivo",
        })
      }
    } catch (err) {
      toast.error("Error al eliminar archivo")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const openPreview = (src: string, name: string) => {
    setPreviewImage({ src, name })
    setZoomLevel(1)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoomLevel((prev) => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      return Math.max(0.5, Math.min(3, prev + delta))
    })
  }

  const toggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 2 : 1))
  }

  const totalFiles = existingFiles.length + files.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Archivos</CardTitle>
        <CardDescription>
          Arrastra archivos aquí o haz clic para seleccionar (máx. {MAX_FILES} archivos, 50MB cada uno)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-sm text-muted-foreground">Suelta los archivos aquí...</p>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Arrastra archivos aquí o haz clic para seleccionar</p>
              <p className="text-xs text-muted-foreground">
                {totalFiles}/{MAX_FILES} archivos • Máximo 50MB cada uno
              </p>
            </div>
          )}
        </div>

        {existingFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Archivos en el servidor ({existingFiles.length})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {existingFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-green-50 dark:bg-green-950/20"
                >
                  {file.mime_type.startsWith("image/") ? (
                    <div
                      className="h-12 w-12 relative rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openPreview(`/api/sftp/serve/${file.id}`, file.original_filename)}
                    >
                      <Image
                        src={`/api/sftp/serve/${file.id}`}
                        alt={file.original_filename}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.original_filename}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)} • En servidor</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("¿Eliminar este archivo del servidor?")) {
                        handleDeleteExisting(file.id!)
                      }
                    }}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Archivos pendientes de subir ({files.length})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20"
                >
                  {file.preview ? (
                    <div
                      className="h-12 w-12 relative rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openPreview(file.preview!, file.name)}
                    >
                      <Image
                        src={file.preview || "/placeholder.svg"}
                        alt={file.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} • Pendiente</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFile(index)} disabled={uploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Subiendo archivos...</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <Button onClick={handleUpload} disabled={files.length === 0 || uploading} className="w-full">
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir {files.length} archivo(s)
            </>
          )}
        </Button>

        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="truncate">{previewImage?.name}</DialogTitle>
            </DialogHeader>
            <div className="h-[calc(95vh-100px)]">
              {previewImage && <ImageZoomViewer src={previewImage.src || "/placeholder.svg"} alt={previewImage.name} />}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
