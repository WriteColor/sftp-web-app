"use client"

import { useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import { LineSpinner } from "@/components/ui/line-spinner"
import type { FileMetadata } from "@/lib/types"

interface FileCardPreviewProps {
  file: FileMetadata
  cachedUrl?: string
  onClick?: () => void
}

export function FileCardPreview({ file, cachedUrl, onClick }: FileCardPreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const isVideo = file.mime_type?.startsWith("video/")
  const isAnimatedImage =
    file.mime_type === "image/gif" ||
    file.mime_type === "image/webp" ||
    file.mime_type === "image/apng"

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  return (
    <div
      className="aspect-square relative cursor-pointer overflow-hidden bg-muted group"
      onClick={onClick}
    >
      {/* Video preview */}
      {isVideo ? (
        <>
          <video
            src={cachedUrl || `/api/sftp/serve/${file.id}`}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedData={handleLoad}
            onError={handleError}
          />
          {/* Play icon overlay - siempre visible en hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors pointer-events-none z-10">
            <div className="bg-black/60 rounded-full p-2 opacity-60 group-hover:opacity-100 transition-opacity">
              <Play className="h-8 w-8 text-white fill-white" />
            </div>
          </div>
        </>
      ) : (
        /* Image preview */
        <Image
          src={cachedUrl || `/api/sftp/serve/${file.id}`}
          alt={file.original_filename}
          fill
          className={`object-cover transition-all duration-300 group-hover:scale-110 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          quality={100}
          unoptimized={isAnimatedImage}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Loading spinner - Sobre todo el contenido */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-20">
          <LineSpinner size="md" color="primary" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-xs z-20">
          Error al cargar
        </div>
      )}
    </div>
  )
}
