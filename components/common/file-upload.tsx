"use client"
import { useState, useCallback, useRef } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, FileIcon } from "lucide-react"
import { LineSpinner } from "@/components/ui/line-spinner"
import type { SFTPConfig, FileMetadataWithStatus } from "@/lib/types"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { MediaViewer } from "../view/media-viewer"
import { UploadProgressItem } from "./upload-progress-item"
import { sanitizeFile } from "@/lib/file-sanitizer"
import { useChunkedUpload } from "@/hooks/use-chunked-upload"

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const MAX_FILES = 20
const LIGHT_FILE_THRESHOLD = 15 * 1024 * 1024 // 15MB - archivos menores usan upload tradicional

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
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string; mimeType: string } | null>(null)
  const uploadingFilesRef = useRef<Map<string, boolean>>(new Map())
  const { uploadFile } = useChunkedUpload()

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      const totalFiles = existingFiles.length + files.length + acceptedFiles.length
      if (totalFiles > MAX_FILES) {
        toast.warning(`Límite alcanzado`, {
          description: `Solo puedes tener un máximo de ${MAX_FILES} archivos. Actualmente tienes ${existingFiles.length + files.length} archivo(s).`,
        })
        return
      }

      const oversizedFiles = acceptedFiles.filter((file) => file.size > MAX_FILE_SIZE)
      if (oversizedFiles.length > 0) {
        toast.warning("Archivos demasiado grandes", {
          description: `${oversizedFiles.length} archivo(s) exceden el tamaño máximo de 500MB`,
        })
        return
      }

      if (rejectedFiles.length > 0) {
        toast.warning("Algunos archivos no se pudieron agregar", {
          description: `${rejectedFiles.length} archivo(s) fueron rechazados`,
        })
      }

      // Primero agregar los archivos para que se muestren las barras de progreso
      const initialFiles = acceptedFiles.map((file) => {
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          return Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        }
        return file
      })

      setFiles((prev) => [...prev, ...initialFiles])

      // Sanitizar archivos para eliminar metadatos (el progreso se muestra en las barras individuales)
      const sanitizedFiles = await Promise.all(
        acceptedFiles.map(async (file, index) => {
          try {
            const sanitized = await sanitizeFile(file)
            // Actualizar el archivo en el estado con el archivo sanitizado
            setFiles((prev) => {
              const newFiles = [...prev]
              const fileIndex = newFiles.findIndex(f => f.name === file.name && f.size === file.size)
              if (fileIndex !== -1) {
                newFiles[fileIndex] = sanitized
              }
              return newFiles
            })
            return sanitized
          } catch (error) {
            console.error(`Error sanitizando ${file.name}:`, error)
            return file // Si falla, usar el archivo original
          }
        })
      )

      toast.success(`${acceptedFiles.length} archivo(s) procesado(s) correctamente`)
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

  const getSortedFiles = () => {
    const lightFiles = files.filter((f) => f.size <= LIGHT_FILE_THRESHOLD)
    const heavyFiles = files.filter((f) => f.size > LIGHT_FILE_THRESHOLD)
    return [...lightFiles, ...heavyFiles]
  }

  const uploadFileWithProgress = async (file: File): Promise<boolean> => {
    try {
      // Emitir evento de inicio de subida
      window.dispatchEvent(
        new CustomEvent("fileProgress", {
          detail: {
            fileName: file.name,
            progress: 0,
            status: "uploading",
            statusMessage: "Iniciando subida...",
          },
        }),
      )

      // Usar chunked upload con progreso real
      const result = await uploadFile({
        file,
        config: sftpConfig,
        uploadBatchId,
        onProgress: (progress, status) => {
          window.dispatchEvent(
            new CustomEvent("fileProgress", {
              detail: {
                fileName: file.name,
                progress,
                status: "uploading",
                statusMessage: status,
              },
            }),
          )
        },
      })

      if (result.success) {
        window.dispatchEvent(
          new CustomEvent("fileProgress", {
            detail: {
              fileName: file.name,
              progress: 100,
              status: "success",
            },
          }),
        )
        return true
      } else {
        window.dispatchEvent(
          new CustomEvent("fileProgress", {
            detail: {
              fileName: file.name,
              progress: 0,
              status: "error",
              error: result.error || "Error desconocido",
            },
          }),
        )
        return false
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("fileProgress", {
          detail: {
            fileName: file.name,
            progress: 0,
            status: "error",
            error: error instanceof Error ? error.message : "Error de conexión",
          },
        }),
      )
      return false
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    uploadingFilesRef.current.clear()

    // Pequeña pausa para que se vea la transición de sanitizado a subida
    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const sortedFiles = getSortedFiles()
      const lightFiles = sortedFiles.filter((f) => f.size <= LIGHT_FILE_THRESHOLD)
      const heavyFiles = sortedFiles.filter((f) => f.size > LIGHT_FILE_THRESHOLD)

      const lightFilePromises = lightFiles.map((file) =>
        uploadFileWithProgress(file).then((success) => {
          if (success) {
            setFiles((prev) => prev.filter((f) => f !== file))
          }
          return success
        }),
      )

      const lightResults = await Promise.all(lightFilePromises)
      const lightSuccessCount = lightResults.filter((r) => r).length

      if (lightSuccessCount > 0) {
        toast.success(`${lightSuccessCount} archivo(s) ligero(s) subido(s)`)
      }

      for (const file of heavyFiles) {
        const success = await uploadFileWithProgress(file)
        if (success) {
          setFiles((prev) => prev.filter((f) => f !== file))
          toast.success(`"${file.name}" subido correctamente`)
        } else {
          toast.error(`Error al subir "${file.name}"`)
        }
      }

      if (files.length === 0) {
        onUploadComplete()
      }
    } catch (error) {
      toast.error("Error durante la subida", {
        description: error instanceof Error ? error.message : "Ocurrió un error",
      })
    } finally {
      setUploading(false)
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

  const isAnimatedImage = (mimeType: string) => {
    return mimeType === "image/gif" || mimeType === "image/webp" || mimeType === "image/apng"
  }

  const isTextFile = (mimeType: string) => {
    return (
      mimeType.startsWith("text/") ||
      mimeType.match(
        /\.(txt|log|cfg|conf|ini|csv|tsv|json|yaml|yml|xml|html|htm|xhtml|md|rst|nfo|diz|properties|toml|c|h|cpp|hpp|cc|cxx|cs|java|py|rb|go|rs|swift|kt|kts|php|pl|lua|m|r|scala|dart|sh|bash|zsh|bat|cmd|ps1|ahk|vbs|ts|tsx|js|jsx|coffee|scss|sass|less|css|jsonld|svg|rss|atom|env|htaccess|reg|plist|desktop|service|dockerfile|gitattributes|gitignore|editorconfig|scm|rpy|dat|tex|bib|sql|lic|manifest|srt|vtt|ass|ssa)$/i,
      )
    )
  }

  const openPreview = (src: string, name: string, mimeType: string) => {
    setPreviewImage({ src, name, mimeType })
  }

  const totalFiles = existingFiles.length + files.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Archivos</CardTitle>
        <CardDescription>
          Arrastra archivos aquí o haz clic para seleccionar (máx. {MAX_FILES} archivos, 500MB cada uno)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
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
                {totalFiles}/{MAX_FILES} archivos • Máximo 500MB cada uno
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
                  {file.mime_type.startsWith("image/") || file.mime_type.startsWith("video/") ? (
                    <div
                      className="h-12 w-12 relative rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openPreview(`/api/sftp/serve/${file.id}`, file.original_filename, file.mime_type)}
                    >
                      {file.mime_type.startsWith("video/") ? (
                        <video src={`/api/sftp/serve/${file.id}`} className="h-12 w-12 object-cover" muted loop />
                      ) : (
                        <Image
                          src={`/api/sftp/serve/${file.id}`}
                          alt={file.original_filename}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={isAnimatedImage(file.mime_type)}
                        />
                      )}
                    </div>
                  ) : isTextFile(file.mime_type) ? (
                    <div className="h-12 w-12 flex items-center justify-center rounded bg-muted">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
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
            <h4 className="text-sm dark:text-white font-medium">
              {uploading ? "Subiendo" : "Archivos pendientes de subir"} ({files.length})
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((file, index) => (
                <UploadProgressItem
                  key={index}
                  file={file}
                  onRemove={() => removeFile(index)}
                  isUploading={uploading}
                  fileSize={formatFileSize(file.size)}
                />
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleUpload} disabled={files.length === 0 || uploading} className="w-full">
          {uploading ? (
            <>
              <LineSpinner size="16" stroke="2" speed="1" className="mr-2 text-white" />
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4 dark:text-white" />
              <span className="dark:text-white">Subir {files.length} archivo(s)</span>
            </>
          )}
        </Button>

        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="truncate">{previewImage?.name}</DialogTitle>
            </DialogHeader>
            <div className="h-[calc(95vh-100px)]">
              {previewImage && (
                <MediaViewer
                  src={previewImage.src || "/placeholder.svg"}
                  alt={previewImage.name}
                  mimeType={previewImage.mimeType}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
