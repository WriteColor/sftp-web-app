"use client"

import type React from "react"

import { useState, useRef, useEffect, type MouseEvent } from "react"
import Image from "next/image"
import { ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageZoomViewerProps {
  src: string
  alt: string
  onClose?: () => void
}

export function ImageZoomViewer({ src, alt, onClose }: ImageZoomViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (zoomLevel === 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [zoomLevel])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setZoomLevel((prev) => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.5, Math.min(5, prev + delta))
      return newZoom
    })
  }

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging && zoomLevel > 1) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      setPosition({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging && zoomLevel === 1) {
      setZoomLevel(2)
    }
  }

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(5, prev + 0.25))
  }

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(0.5, prev - 0.25))
  }

  const resetZoom = () => {
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <Button variant="ghost" size="icon" onClick={zoomOut} disabled={zoomLevel <= 0.5}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="flex items-center px-3 text-sm font-medium min-w-[60px] justify-center">
          {Math.round(zoomLevel * 100)}%
        </div>
        <Button variant="ghost" size="icon" onClick={zoomIn} disabled={zoomLevel >= 5}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={resetZoom}>
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <a href={src} download={alt}>
            <Download className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* Image container with proper overflow handling */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        style={{
          cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
        }}
      >
        <div
          className="min-w-full min-h-full flex items-center justify-center p-4"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
        >
          <div className="relative w-full h-full">
            <Image
              src={src || "/placeholder.svg"}
              alt={alt}
              fill
              className="object-contain pointer-events-none select-none"
              sizes="100vw"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 text-xs text-muted-foreground">
        {zoomLevel === 1
          ? "Haz clic o usa la rueda del ratón para hacer zoom"
          : "Arrastra para mover • Rueda para zoom"}
      </div>
    </div>
  )
}
