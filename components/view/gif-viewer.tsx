"use client"
import { useState, useRef, useEffect } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GifViewerProps {
  src: string
  alt: string
}

export function GifViewer({ src, alt }: GifViewerProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setIsPlaying(true)
  }, [src])

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
    if (imgRef.current) {
      imgRef.current.style.animationPlayState = isPlaying ? "paused" : "running"
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-background">
      {/* Toolbar - simplified for GIFs (no zoom) */}
      <div className="absolute right-4 z-10 flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <Button className="dark:text-white" variant="ghost" size="icon" asChild title="Descargar">
          <a href={src} download={alt}>
            <Download className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* GIF container */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center">
        <img
          ref={imgRef}
          src={src || "/placeholder.svg"}
          alt={alt}
          className="max-w-full max-h-full object-contain pointer-events-none select-none"
          style={{
            animationPlayState: isPlaying ? "running" : "paused",
          }}
        />
      </div>
    </div>
  )
}
