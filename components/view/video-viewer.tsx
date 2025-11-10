"use client"

import { useRef } from "react"
import dynamic from "next/dynamic"

const VideoJS = dynamic(() => import("./videojs"), { ssr: false })

interface VideoViewerProps {
  src: string
  alt: string
  poster?: string
  tracks?: Array<{
    kind: "subtitles" | "captions" | "chapters"
    src: string
    srclang: string
    label: string
    default?: boolean
  }>
}

export function VideoViewer({ src, alt, poster, tracks }: VideoViewerProps) {
  const playerRef = useRef<any>(null)

  // Detectar si es un archivo HLS (m3u8) o un video normal
  const isHLS = src.endsWith('.m3u8') || src.includes('ik-master.m3u8')
  
  const videoJsOptions = {
    controls: true,
    responsive: true,
    fluid: false, // Deshabilitado para control manual del tamaño
    autoplay: false,
    muted: false,
    playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    sources: [
      {
        src: src,
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

  const handlePlayerReady = (player: any) => {
    playerRef.current = player

    // Log de eventos del reproductor (opcional, para debugging)
    player.on("waiting", () => {
      console.log("Player is waiting")
    })

    player.on("loadedmetadata", () => {
      console.log("Video metadata loaded")
    })

    player.on("dispose", () => {
      console.log("Player disposed")
    })
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-background p-4 overflow-hidden">
      <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
        <div className="relative w-full h-full" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />
        </div>
      </div>
    </div>
  )
}
