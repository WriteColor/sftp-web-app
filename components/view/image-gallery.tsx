"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Trash2, ImageIcon, FileIcon, Check } from "lucide-react"
import { LineSpinner } from "@/components/ui/line-spinner"
import type { FileMetadata, SFTPConfig } from "@/lib/types"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { MediaViewer } from "./media-viewer"
import { GallerySkeleton } from "../common/gallery-skeleton"
import { useMediaCache } from "@/hooks/use-media-cache"
import { DeleteConfirmationDialog } from "../common/delete-confirmation-dialog"
import { Play } from "lucide-react"

interface ImageGalleryProps {
  sftpConfig: SFTPConfig
  uploadBatchId?: string
}

export function ImageGallery({ sftpConfig, uploadBatchId }: ImageGalleryProps) {
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<FileMetadata | null>(null)
  const [cachedUrls, setCachedUrls] = useState<Map<string, string>>(new Map())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; fileId?: string; isBulk?: boolean }>({
    open: false,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { getCachedFile, cacheFile } = useMediaCache()

  const loadFiles = async () => {
    setLoading(true)
    setIsRefreshing(true)

    try {
      const url = uploadBatchId ? `/api/sftp/files?uploadBatchId=${uploadBatchId}` : "/api/sftp/files"

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setFiles(data.files || [])
      } else {
        toast.error("Error al cargar archivos", {
          description: data.message || "No se pudieron cargar los archivos",
        })
      }
    } catch (err) {
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor",
      })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const preloadCachedFiles = async () => {
      const newCachedUrls = new Map<string, string>()

      for (const file of files) {
        const cached = await getCachedFile(file.id!)
        if (cached) {
          const url = URL.createObjectURL(cached)
          newCachedUrls.set(file.id!, url)
        }
      }

      setCachedUrls(newCachedUrls)
    }

    if (files.length > 0) {
      preloadCachedFiles()
    }
  }, [files, getCachedFile])

  useEffect(() => {
    loadFiles()
  }, [uploadBatchId])

  const handleDelete = async (fileId: string) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/sftp/files/${fileId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: sftpConfig }),
      })

      const data = await response.json()

      if (data.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId))
        // Actualizar el estado de selección eliminando el archivo del conjunto
        setSelectedIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(fileId)
          setHasSelection(newSet.size > 0)
          return newSet
        })
        toast.success("Archivo eliminado correctamente")
      } else {
        toast.error("Error al eliminar", {
          description: data.message || "No se pudo eliminar el archivo",
        })
      }
    } catch (err) {
      toast.error("Error al eliminar archivo")
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({ open: false })
    }
  }

  const handleDeleteSelected = async () => {
    setIsDeleting(true)
    let successCount = 0

    for (const fileId of selectedIds) {
      try {
        const response = await fetch(`/api/sftp/files/${fileId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: sftpConfig }),
        })

        const data = await response.json()

        if (data.success) {
          successCount++
          setFiles((prev) => prev.filter((f) => f.id !== fileId))
        }
      } catch (err) {
        console.error("Error deleting file:", err)
      }
    }

    setIsDeleting(false)
    setDeleteConfirm({ open: false })
    setSelectedIds(new Set())

    if (successCount > 0) {
      toast.success(`${successCount} archivo(s) eliminado(s) correctamente`)
    } else {
      toast.error("Error al eliminar archivos")
    }
  }

  const toggleSelection = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      setHasSelection(newSet.size > 0)
      return newSet
    })
  }

  const openImage = async (file: FileMetadata) => {
    setSelectedImage(file)

    // Try to cache the file if not already cached
    if (!cachedUrls.has(file.id!)) {
      try {
        const response = await fetch(`/api/sftp/serve/${file.id}`)
        if (response.ok) {
          const blob = await response.blob()
          await cacheFile(file.id!, blob)
          const url = URL.createObjectURL(blob)
          setCachedUrls((prev) => new Map(prev).set(file.id!, url))
        }
      } catch (error) {
        console.error("Error caching file:", error)
      }
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

  const isAnimatedImage = (mimeType: string) => {
    return mimeType === "image/gif" || mimeType === "image/webp" || mimeType === "image/apng"
  }

  const isVideo = (mimeType: string) => {
    return mimeType.startsWith("video/")
  }

  const isMedia = (mimeType: string) => {
    return mimeType.startsWith("image/") || mimeType.startsWith("video/")
  }

  const isTextFile = (mimeType: string) => {
    return (
      mimeType.startsWith("text/") ||
      mimeType === "application/json" ||
      mimeType === "application/xml" ||
      mimeType === "application/x-yaml"
    )
  }

  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Galería de Archivos</CardTitle>
              <CardDescription className="mt-1">Cargando archivos...</CardDescription>
            </div>
            <Button variant="outline" size="icon" disabled className="border-border bg-transparent">
              <LineSpinner size="20" stroke="3" speed="1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <GallerySkeleton />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Galería de Archivos</CardTitle>
              <CardDescription className="mt-1">{files.length} archivo(s) almacenado(s)</CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirm({ open: true, isBulk: true })}
                    disabled={isDeleting}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar ({selectedIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedIds(new Set())
                      setHasSelection(false)
                    }}
                    className="gap-2"
                  >
                    Limpiar selección
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={loadFiles}
                disabled={isRefreshing}
                className="border-border"
              >
                {isRefreshing ? (
                  <LineSpinner size="20" stroke="3" speed="1" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="stroke-black group-hover:stroke-white dark:stroke-white"

                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 16h5v5" />
                  </svg>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {files.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-lg bg-muted">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No hay archivos subidos</p>
              <p className="text-sm text-muted-foreground">Sube archivos desde la pestaña de subida</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group relative border border-border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-all hover:shadow-md"
                >
                  <div
                    className={`absolute top-3 left-3 z-10 transition-opacity ${hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  >
                    <button
                      onClick={(e) => toggleSelection(file.id!, e)}
                      className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-all ${selectedIds.has(file.id!)
                          ? "bg-primary border-primary shadow-md"
                          : "bg-background border-muted-foreground/30 hover:border-primary"
                        }`}
                    >
                      {selectedIds.has(file.id!) && (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </button>
                  </div>

                  {isMedia(file.mime_type) ? (
                    <div
                      className="aspect-square relative cursor-pointer overflow-hidden bg-muted group"
                      onClick={() => openImage(file)}
                    >
                      {isVideo(file.mime_type) ? (
                        <>
                          <video
                            src={cachedUrls.get(file.id!) || `/api/sftp/serve/${file.id}`}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                            <Play className="h-8 w-8 text-white fill-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <Image
                          src={cachedUrls.get(file.id!) || `/api/sftp/serve/${file.id}`}
                          alt={file.original_filename}
                          fill
                          className="object-cover transition-transform group-hover:scale-110"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          unoptimized={isAnimatedImage(file.mime_type)}
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      className="aspect-square flex flex-col items-center justify-center bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => openImage(file)}
                    >
                      <FileIcon className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground text-center px-2 truncate">
                        {file.original_filename}
                      </p>
                    </div>
                  )}

                  <div className="p-4 space-y-3 border-t border-border">
                    <div>
                      <p className="text-sm font-medium truncate text-foreground" title={file.original_filename}>
                        {file.original_filename}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
                        <span className="font-medium">{formatFileSize(file.file_size)}</span>
                        <span>{formatDate(file.uploaded_at || "")}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-border text-xs"
                        asChild
                      >
                        <a
                          href={cachedUrls.get(file.id!) || `/api/sftp/serve/${file.id}?download=true`}
                          download={file.original_filename}
                        >
                          {/* <Download className="h-3.5 w-3.5 mr-1.5 hover:text-white" /> */}
                          Descargar
                        </a>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteConfirm({ open: true, fileId: file.id, isBulk: false })}
                        disabled={isDeleting}
                        className="text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="truncate">{selectedImage?.original_filename}</DialogTitle>
                <DialogDescription>
                  {selectedImage &&
                    `${formatFileSize(selectedImage.file_size)} • ${formatDate(selectedImage.uploaded_at || "")}`}
                </DialogDescription>
              </DialogHeader>
              <div className="h-[calc(95vh-120px)]">
                {selectedImage && (
                  <MediaViewer
                    src={cachedUrls.get(selectedImage.id!) || `/api/sftp/serve/${selectedImage.id}`}
                    alt={selectedImage.original_filename}
                    mimeType={selectedImage.mime_type}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open })}
        onConfirm={() => {
          if (deleteConfirm.isBulk) {
            handleDeleteSelected()
          } else if (deleteConfirm.fileId) {
            handleDelete(deleteConfirm.fileId)
          }
        }}
        title={deleteConfirm.isBulk ? "Eliminar archivos seleccionados" : "Eliminar archivo"}
        description={
          deleteConfirm.isBulk
            ? `¿Está seguro de que desea eliminar ${selectedIds.size} archivo(s)? Esta acción no se puede deshacer.`
            : "Está seguro de que desea eliminar este archivo? Esta acción no se puede deshacer."
        }
        isLoading={isDeleting}
      />
    </>
  )
}
