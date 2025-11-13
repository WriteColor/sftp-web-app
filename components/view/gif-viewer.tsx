"use client"
import { useState, useRef, useEffect } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LineSpinner } from "@/components/ui/line-spinner"

interface GifViewerProps {
  src: string
  alt: string
}

export function GifViewer({ src, alt }: GifViewerProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setIsPlaying(true)
    setIsLoading(true)
    setHasError(false)
  }, [src])

  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
    if (imgRef.current) {
      imgRef.current.style.animationPlayState = isPlaying ? "paused" : "running"
    }
  }

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
        <div className="text-center">
          <p>Error al cargar la imagen</p>
          <p className="text-sm mt-2">{alt}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full max-w-full flex flex-col bg-background overflow-hidden">
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-30">
          <div className="flex flex-col items-center gap-4">
            <LineSpinner size="lg" color="white" />
            <p className="text-sm text-muted-foreground">Cargando imagen...</p>
          </div>
        </div>
      )}

      {/* Toolbar - simplified for GIFs (no zoom) */}
      <div className="absolute right-4 top-1 z-10 flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <Button className="dark:text-white" variant="ghost" size="icon" asChild title="Descargar">
          <a href={src} download={alt}>
            <Download className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* GIF container */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center max-w-full">
        <img
          ref={imgRef}
          src={src || "/placeholder.svg"}
          alt={alt}
          className={`max-w-full max-h-full object-contain pointer-events-none select-none transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          style={{
            animationPlayState: isPlaying ? "running" : "paused",
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
    </div>
  )
}
