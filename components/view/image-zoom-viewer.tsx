"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
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
  const animationFrameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
    setIsDragging(false)
  }, [src])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()

    const container = containerRef.current
    if (!container) return

    // Get mouse position relative to container
    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2

    setZoomLevel((prev) => {
      const delta = e.deltaY > 0 ? -0.15 : 0.15
      const newZoom = Math.max(1, Math.min(5, prev + delta))

      // If zooming out below previous level, gradually re-center the image
      if (newZoom < prev && newZoom > 1) {
        setPosition((currentPos) => {
          const totalDistance = Math.sqrt(currentPos.x ** 2 + currentPos.y ** 2)
          const reductionFactor = (5 - newZoom) / 4 // Maps 1->1, 5->0
          return {
            x: currentPos.x * (1 - reductionFactor * 0.3),
            y: currentPos.y * (1 - reductionFactor * 0.3),
          }
        })
      }

      // Auto-center when reaching 100% zoom
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 })
      }

      return newZoom
    })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && zoomLevel > 1) {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const maxX = (rect.width * (zoomLevel - 1)) / 2
      const maxY = (rect.height * (zoomLevel - 1)) / 2

      let newX = e.clientX - dragStart.x
      let newY = e.clientY - dragStart.y

      newX = Math.max(-maxX, Math.min(maxX, newX))
      newY = Math.max(-maxY, Math.min(maxY, newY))

      setPosition({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(5, prev + 0.25))
  }

  const zoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(1, prev - 0.25)

      if (newZoom < prev && newZoom > 1) {
        // Gradual re-centering when zooming out
        setPosition((currentPos) => {
          const reductionFactor = (5 - newZoom) / 4
          return {
            x: currentPos.x * (1 - reductionFactor * 0.3),
            y: currentPos.y * (1 - reductionFactor * 0.3),
          }
        })
      }

      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 })
      }

      return newZoom
    })
  }

  const resetZoom = () => {
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="absolute right-1 z-10 flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <Button className="dark:text-white" variant="ghost" size="icon" onClick={zoomOut} disabled={zoomLevel <= 1} title="Alejar">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="flex items-center px-3 text-sm font-medium min-w-[60px] justify-center">
          {Math.round(zoomLevel * 100)}%
        </div>
        <Button className="dark:text-white" variant="ghost" size="icon" onClick={zoomIn} disabled={zoomLevel >= 5} title="Acercar">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button className="dark:text-white" variant="ghost" size="icon" onClick={resetZoom} title="Reiniciar">
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button className="dark:text-white" variant="ghost" size="icon" asChild title="Descargar">
          <a href={src} download={alt}>
            <Download className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.2s ease-out",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="relative w-full h-full max-w-full max-h-full">
            <Image
              src={src || "/placeholder.svg"}
              alt={alt}
              fill
              className="object-contain pointer-events-none select-none"
              sizes="100vw"
              draggable={false}
              priority
              unoptimized={src.startsWith("blob:")}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
