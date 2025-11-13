"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LineSpinner } from "@/components/ui/line-spinner"

interface ImageZoomViewerProps {
  src: string
  alt: string
  onClose?: () => void
  fileId?: string
  onLoadStart?: (fileId: string) => void
  onLoadEnd?: (fileId: string) => void
}

export function ImageZoomViewer({ src, alt, onClose, fileId, onLoadStart, onLoadEnd }: ImageZoomViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const touchStartDistanceRef = useRef(0)
  const touchStartZoomRef = useRef(1)
  const rafRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef(0)
  const boundingRectRef = useRef<DOMRect | null>(null)

  // Actualizar bounding rect al cargar o redimensionar
  useEffect(() => {
    const updateBoundingRect = () => {
      if (containerRef.current) {
        boundingRectRef.current = containerRef.current.getBoundingClientRect()
      }
    }

    updateBoundingRect()
    window.addEventListener("resize", updateBoundingRect)

    return () => {
      window.removeEventListener("resize", updateBoundingRect)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2) {
        // Pinch zoom
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
        touchStartDistanceRef.current = distance
        touchStartZoomRef.current = zoomLevel
      } else if (e.touches.length === 1 && zoomLevel > 1) {
        // Single touch drag (solo si está zoomeado)
        setIsDragging(true)
        const touch = e.touches[0]
        setDragStart({
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        })
      }
    },
    [zoomLevel, position],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2) {
        // Pinch zoom
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)

        if (touchStartDistanceRef.current > 0) {
          const scale = distance / touchStartDistanceRef.current
          const newZoom = Math.max(1, Math.min(5, touchStartZoomRef.current * scale))

          // Throttle updates usando requestAnimationFrame
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
          }

          rafRef.current = requestAnimationFrame(() => {
            setZoomLevel(newZoom)

            // Auto-center when reaching 100% zoom
            if (newZoom === 1) {
              setPosition({ x: 0, y: 0 })
            }
          })
        }
      } else if (isDragging && e.touches.length === 1 && zoomLevel > 1) {
        // Single touch drag con throttling
        const now = performance.now()
        if (now - lastUpdateTimeRef.current < 16) return // ~60fps max

        lastUpdateTimeRef.current = now

        const rect = boundingRectRef.current
        if (!rect) return

        const touch = e.touches[0]
        const maxX = (rect.width * (zoomLevel - 1)) / 2
        const maxY = (rect.height * (zoomLevel - 1)) / 2

        let newX = touch.clientX - dragStart.x
        let newY = touch.clientY - dragStart.y

        newX = Math.max(-maxX, Math.min(maxX, newX))
        newY = Math.max(-maxY, Math.min(maxY, newY))

        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }

        rafRef.current = requestAnimationFrame(() => {
          setPosition({ x: newX, y: newY })
        })
      }
    },
    [isDragging, zoomLevel, dragStart],
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    touchStartDistanceRef.current = 0
  }, [])

  // Agregar event listeners de touch con passive: false
  useEffect(() => {
    const imageElement = imageRef.current
    if (!imageElement) return

    const handleTouchStartNative = (e: TouchEvent) => {
      if (e.touches.length === 2 || (e.touches.length === 1 && zoomLevel > 1)) {
        e.preventDefault()
      }
    }

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (e.touches.length === 2 || (isDragging && e.touches.length === 1 && zoomLevel > 1)) {
        e.preventDefault()
      }
    }

    imageElement.addEventListener("touchstart", handleTouchStartNative, { passive: false })
    imageElement.addEventListener("touchmove", handleTouchMoveNative, { passive: false })

    return () => {
      imageElement.removeEventListener("touchstart", handleTouchStartNative)
      imageElement.removeEventListener("touchmove", handleTouchMoveNative)
    }
  }, [zoomLevel, isDragging])

  useEffect(() => {
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
    setIsDragging(false)
    setIsLoading(true)
    setHasError(false)

    if (fileId && onLoadStart) {
      onLoadStart(fileId)
    }
  }, [src, fileId, onLoadStart])

  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)

    if (fileId && onLoadEnd) {
      onLoadEnd(fileId)
    }
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)

    if (fileId && onLoadEnd) {
      onLoadEnd(fileId)
    }
  }

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2

    setZoomLevel((prev) => {
      const delta = e.deltaY > 0 ? -0.15 : 0.15
      const newZoom = Math.max(1, Math.min(5, prev + delta))

      if (newZoom < prev && newZoom > 1) {
        setPosition((currentPos) => {
          const totalDistance = Math.sqrt(currentPos.x ** 2 + currentPos.y ** 2)
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
      // Actualizar bounding rect al iniciar drag
      if (containerRef.current) {
        boundingRectRef.current = containerRef.current.getBoundingClientRect()
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && zoomLevel > 1) {
      const rect = boundingRectRef.current
      if (!rect) return

      const maxX = (rect.width * (zoomLevel - 1)) / 2
      const maxY = (rect.height * (zoomLevel - 1)) / 2

      let newX = e.clientX - dragStart.x
      let newY = e.clientY - dragStart.y

      newX = Math.max(-maxX, Math.min(maxX, newX))
      newY = Math.max(-maxY, Math.min(maxY, newY))

      // Throttle usando requestAnimationFrame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = requestAnimationFrame(() => {
        setPosition({ x: newX, y: newY })
      })
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
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-30">
          <div className="flex flex-col items-center gap-4">
            <LineSpinner size="lg" color="primary" />
            <p className="text-sm text-muted-foreground">Cargando imagen...</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1 z-10 flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2 shadow-lg max-w-[calc(100%-1rem)]">
        <Button
          className="dark:text-white"
          variant="ghost"
          size="icon"
          onClick={zoomOut}
          disabled={zoomLevel <= 1}
          title="Alejar"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="flex items-center px-3 text-sm font-medium min-w-[60px] justify-center">
          {Math.round(zoomLevel * 100)}%
        </div>
        <Button
          className="dark:text-white"
          variant="ghost"
          size="icon"
          onClick={zoomIn}
          disabled={zoomLevel >= 5}
          title="Acercar"
        >
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
        className="flex-1 overflow-hidden relative flex items-center justify-center touch-none max-w-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        <div
          ref={imageRef}
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
            willChange: isDragging ? "transform" : "auto",
          }}
        >
          <div className="relative w-full h-full max-w-full max-h-full">
            <Image
              src={src || "/placeholder.svg"}
              alt={alt}
              fill
              className={`object-contain pointer-events-none select-none transition-opacity duration-300 ${
                isLoading ? "opacity-0" : "opacity-100"
              }`}
              sizes="100vw"
              quality={100}
              draggable={false}
              priority
              unoptimized={src.startsWith("blob:")}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
