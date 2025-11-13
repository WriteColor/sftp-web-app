"use client"

import { useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import { useVideoStream } from "@/hooks/use-video-stream"
import { LineSpinner } from "@/components/ui/line-spinner"

const VideoJS = dynamic(() => import("./videojs"), { ssr: false })

interface VideoViewerProps {
  src: string
  alt: string
  poster?: string
  fileId?: string
  fileSize?: number
  tracks?: Array<{
    kind: "subtitles" | "captions" | "chapters"
    src: string
    srclang: string
    label: string
    default?: boolean
  }>
  onCached?: (fileId: string, blobUrl: string) => void
  onLoadStart?: (fileId: string) => void
  onLoadEnd?: (fileId: string) => void
}

export function VideoViewer({
  src,
  alt,
  poster,
  fileId,
  fileSize,
  tracks,
  onCached,
  onLoadStart,
  onLoadEnd,
}: VideoViewerProps) {
  const playerRef = useRef<any>(null)

  const isHLS = src.endsWith(".m3u8") || src.includes("ik-master.m3u8")
  const isBlobUrl = src.startsWith("blob:")

  const handleLoadStart = useCallback(() => {
    if (fileId && onLoadStart) onLoadStart(fileId)
  }, [fileId, onLoadStart])

  const handleLoadEnd = useCallback(() => {
    if (fileId && onLoadEnd) onLoadEnd(fileId)
  }, [fileId, onLoadEnd])

  const handleCached = useCallback(
    (id: string, blobUrl: string) => {
      if (onCached) onCached(id, blobUrl)
    },
    [onCached],
  )

  const shouldUseStream = !isHLS && !isBlobUrl && fileId
  const videoStream = useVideoStream({
    fileId: fileId || "",
    fileSize,
    enabled: !!shouldUseStream,
    onLoadStart: handleLoadStart,
    onLoadEnd: handleLoadEnd,
    onCached: handleCached,
  })

  const finalVideoSrc = shouldUseStream && videoStream.url ? videoStream.url : src
  const isLoading = shouldUseStream ? videoStream.isLoading : false

  const videoJsOptions = finalVideoSrc
    ? {
        controls: true,
        responsive: true,
        fluid: false,
        autoplay: false,
        muted: false,
        playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        sources: [
          {
            src: finalVideoSrc,
            type: isHLS ? "application/x-mpegURL" : "video/mp4",
          },
        ],
        poster: poster,
        tracks: tracks,
        html5: {
          vhs: {
            overrideNative: true,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
      }
    : null

  const handlePlayerReady = (player: any) => {
    playerRef.current = player

    player.on("waiting", () => {
      console.log("Player is waiting")
    })

    player.on("loadeddata", () => {
      console.log("Video loaded and ready")
    })

    player.on("loadedmetadata", () => {
      console.log("Video metadata loaded")
    })

    player.on("dispose", () => {
      console.log("Player disposed")
    })
  }

  return (
    <div className="relative w-full h-full max-w-full flex items-center justify-center bg-background p-4 overflow-hidden">
      {isLoading || !videoJsOptions ? (
        <div className="flex flex-col items-center justify-center gap-4">
          <LineSpinner size="lg" color="primary" />
          <p className="text-sm text-muted-foreground">Cargando video...</p>
        </div>
      ) : (
        <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
          <div className="relative w-full h-full max-w-full" style={{ maxHeight: "calc(100vh - 8rem)" }}>
            <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />
          </div>
        </div>
      )}
    </div>
  )
}
