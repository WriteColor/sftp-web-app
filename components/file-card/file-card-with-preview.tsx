"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Trash2, FileIcon, Check, Play } from "lucide-react"
import { LineSpinner } from "@/components/ui/line-spinner"
import type { FileMetadata } from "@/lib/types"

interface FileCardWithPreviewProps {
  file: FileMetadata
  cachedUrl?: string
  isSelected?: boolean
  onSelect?: () => void
  onDelete?: () => void
  onDownload?: () => void
  onClick?: () => void
}

export function FileCardWithPreview({
  file,
  cachedUrl,
  isSelected,
  onSelect,
  onDelete,
  onDownload,
  onClick,
}: FileCardWithPreviewProps) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const isImage = file.mime_type?.startsWith("image/")
  const isVideo = file.mime_type?.startsWith("video/")
  const isPreviewable = isImage || isVideo

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-2 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      style={{
        animationDelay: "0ms",
        animationFillMode: "both",
      }}
    >
      {/* Checkbox de selección */}
      {onSelect && (
        <div className="absolute top-2 left-2 z-10">
          <Button
            variant={isSelected ? "default" : "secondary"}
            size="icon"
            className={`h-6 w-6 rounded-full transition-all ${
              isSelected ? "scale-100" : "scale-0 group-hover:scale-100"
            }`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </Button>
        </div>
      )}

      {/* Área de preview */}
      <div
        className="relative w-full h-48 bg-muted cursor-pointer flex items-center justify-center overflow-hidden"
        onClick={onClick}
      >
        {isPreviewable && !imageError ? (
          <>
            {/* Loading spinner */}
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                <LineSpinner size="md" color="primary" />
              </div>
            )}

            {/* Preview de imagen */}
            {isImage && cachedUrl && (
              <Image
                src={cachedUrl}
                alt={file.filename}
                fill
                className={`object-contain transition-opacity duration-300 ${
                  imageLoading ? "opacity-0" : "opacity-100"
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            )}

            {/* Preview de video */}
            {isVideo && cachedUrl && (
              <div className="relative w-full h-full">
                <video
                  src={cachedUrl}
                  className={`w-full h-full object-contain transition-opacity duration-300 ${
                    imageLoading ? "opacity-0" : "opacity-100"
                  }`}
                  onLoadedData={handleImageLoad}
                  onError={handleImageError}
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="bg-black/60 rounded-full p-3">
                    <Play className="h-8 w-8 text-white" fill="white" />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <FileIcon className="h-16 w-16 text-muted-foreground" />
        )}

        {/* Overlay con acciones */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          {onDownload && (
            <Button
              size="icon"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onDownload()
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="icon"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Información del archivo */}
      <CardHeader className="p-4">
        <CardTitle className="text-sm truncate" title={file.filename}>
          {file.filename}
        </CardTitle>
        <CardDescription className="text-xs">
          {new Date(file.uploaded_at || "").toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
