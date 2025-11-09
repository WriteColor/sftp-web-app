"use client"

import { useState, useRef } from "react"

interface VideoViewerProps {
  src: string
  alt: string
}

export function VideoViewer({ src, alt }: VideoViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen?.().catch(() => {
          setIsFullscreen(true)
        })
      } else {
        document.exitFullscreen?.()
        setIsFullscreen(false)
      }
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-background items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        controls
        onVolumeChange={(e) => {
          const target = e.target as HTMLVideoElement
          setIsMuted(target.muted)
        }}
      />
    </div>
  )
}
