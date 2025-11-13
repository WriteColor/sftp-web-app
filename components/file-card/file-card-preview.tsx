"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import type { FileMetadata } from "@/lib/types"
import { useImageStream } from "@/hooks/use-image-stream"
import { useVideoStream } from "@/hooks/use-video-stream"
import { FileCardSkeleton } from "./file-card-skeleton"

interface FileCardPreviewProps {
  file: FileMetadata
  cachedUrl?: string
  onClick?: () => void
  onCacheReady?: (fileId: string, blobUrl: string) => void
  onLoadStart?: (fileId: string) => void
  onLoadEnd?: (fileId: string) => void
}

export function FileCardPreview({
  file,
  cachedUrl,
  onClick,
  onCacheReady,
  onLoadStart,
  onLoadEnd,
}: FileCardPreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const isVideo = file.mime_type?.startsWith("video/")
  const isAnimatedImage =
    file.mime_type === "image/gif" || file.mime_type === "image/webp" || file.mime_type === "image/apng"

  const handleLoadStartInternal = useCallback(() => {
    setIsLoading(true)
    if (file.id && onLoadStart) onLoadStart(file.id)
  }, [file.id, onLoadStart])

  const handleLoadEndInternal = useCallback(() => {
    setIsLoading(false)
    if (file.id && onLoadEnd) onLoadEnd(file.id)
  }, [file.id, onLoadEnd])

  const handleCached = useCallback(
    (fileId: string, blobUrl: string) => {
      if (onCacheReady) onCacheReady(fileId, blobUrl)
    },
    [onCacheReady],
  )

  const imageStream = useImageStream({
    fileId: file.id || "",
    fileSize: file.file_size,
    enabled: !isVideo,
    cachedUrl,
    onLoadStart: handleLoadStartInternal,
    onLoadEnd: handleLoadEndInternal,
    onCached: handleCached,
  })

  const videoStream = useVideoStream({
    fileId: file.id || "",
    fileSize: file.file_size,
    enabled: isVideo,
    onLoadStart: handleLoadStartInternal,
    onLoadEnd: handleLoadEndInternal,
    onCached: handleCached,
  })

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const mediaUrl = isVideo ? videoStream.url : imageStream.url
  const finalUrl = mediaUrl || `/api/sftp/serve/${file.id}`

  return (
    <div className="aspect-square relative cursor-pointer overflow-hidden bg-muted group" onClick={onClick}>
      {isVideo ? (
        <>
          <video
            src={finalUrl}
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors pointer-events-none z-10">
            <div className="bg-black/60 rounded-full p-2 opacity-60 group-hover:opacity-100 transition-opacity">
              <Play className="h-8 w-8 text-white fill-white" />
            </div>
          </div>
        </>
      ) : (
        <Image
          src={finalUrl || "/placeholder.svg"}
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

      {isLoading && (
        <div className="absolute inset-0 z-20">
          <FileCardSkeleton />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-xs z-20">
          Error al cargar
        </div>
      )}
    </div>
  )
}
