"use client"

import { useRef, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useMediaCache } from "@/hooks/use-media-cache"
import { LineSpinner } from "@/components/ui/line-spinner"

const VideoJS = dynamic(() => import("./videojs"), { ssr: false })

interface VideoViewerProps {
  src: string
  alt: string
  poster?: string
  fileId?: string
  tracks?: Array<{
    kind: "subtitles" | "captions" | "chapters"
    src: string
    srclang: string
    label: string
    default?: boolean
  }>
  onCached?: (fileId: string, blobUrl: string) => void
}

export function VideoViewer({ src, alt, poster, fileId, tracks, onCached }: VideoViewerProps) {
  const playerRef = useRef<any>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { getCachedFile, cacheFile } = useMediaCache()

  // Detectar si es un archivo HLS (m3u8) o un video normal
  const isHLS = src.endsWith('.m3u8') || src.includes('ik-master.m3u8')
  // Detectar si el src ya es un blob URL (ya cacheado)
  const isBlobUrl = src.startsWith('blob:')

  // Cargar video desde caché o servidor (optimizado para no bloquear UI)
  useEffect(() => {
    let isMounted = true
    let objectUrl: string | null = null

    const loadVideo = async () => {
      // Si ya es un blob URL, usarlo directamente (instantáneo)
      if (isBlobUrl) {
        if (isMounted) {
          setVideoSrc(src)
          setIsLoading(false)
        }
        return
      }

      // HLS no se puede cachear (son múltiples archivos), usar src directo
      if (isHLS) {
        if (isMounted) {
          setVideoSrc(src)
          setIsLoading(false)
        }
        return
      }

      // Para videos normales, intentar cargar desde caché primero
      if (fileId) {
        try {
          const cached = await getCachedFile(fileId)
          if (cached && isMounted) {
            objectUrl = URL.createObjectURL(cached)
            setVideoSrc(objectUrl)
            setIsLoading(false)
            
            // Notificar que tenemos el video cacheado
            if (onCached) {
              onCached(fileId, objectUrl)
            }
            return
          }
        } catch {
          // Continuar con carga desde servidor
        }
      }

      // Si no está en caché, cargar desde servidor
      if (isMounted) {
        try {
          setIsLoading(true)
          const response = await fetch(src)
          if (!response.ok) throw new Error('Error al cargar video')
          
          const blob = await response.blob()

          if (isMounted) {
            objectUrl = URL.createObjectURL(blob)
            setVideoSrc(objectUrl)
            setIsLoading(false)
            
            // Cachear el video en segundo plano (no bloquea)
            if (fileId) {
              cacheFile(fileId, blob).catch(() => {
                // Error silencioso
              })
              
              // Notificar que hemos cacheado el video
              if (onCached) {
                onCached(fileId, objectUrl)
              }
            }
          }
        } catch (error) {
          // Fallback al src original
          if (isMounted) {
            setVideoSrc(src)
            setIsLoading(false)
          }
        }
      }
    }

    loadVideo()

    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [src, fileId, isHLS, isBlobUrl, onCached, getCachedFile, cacheFile])

  const videoJsOptions = videoSrc ? {
    controls: true,
    responsive: true,
    fluid: false, // Deshabilitado para control manual del tamaño
    autoplay: false,
    muted: false,
    playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    sources: [
      {
        src: videoSrc,
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
  } : null

  const handlePlayerReady = (player: any) => {
    playerRef.current = player

    // Eventos del reproductor para mejorar UX
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
    <div className="relative w-full h-full flex items-center justify-center bg-background p-4 overflow-hidden">
      {isLoading || !videoJsOptions ? (
        <div className="flex flex-col items-center justify-center gap-4">
          <LineSpinner size="lg" color="primary" />
          <p className="text-sm text-muted-foreground">Cargando video...</p>
        </div>
      ) : (
        <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
          <div className="relative w-full h-full" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
            <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />
          </div>
        </div>
      )}
    </div>
  )
}
