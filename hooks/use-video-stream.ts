"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useMediaCache } from "./use-media-cache"

interface UseVideoStreamOptions {
  fileId: string
  fileSize?: number
  enabled?: boolean
  onLoadStart?: () => void
  onLoadEnd?: () => void
  onCached?: (fileId: string, blobUrl: string) => void
}

interface VideoStreamState {
  url: string | null
  isLoading: boolean
  error: Error | null
  progress: number
  isCached: boolean
}

/**
 * Hook especializado para streaming de video con cache inteligente
 * Optimized for large files with chunked caching and better performance
 *
 * Características:
 * - Prioriza cache antes de hacer peticiones de red
 * - Soporta streaming progresivo con range requests
 * - Maneja automáticamente la limpieza de blob URLs
 * - Reporta progreso de carga
 * - Gestión robusta de errores
 * - Optimized for large files (>100MB) with server-side streaming
 */
export function useVideoStream({
  fileId,
  fileSize,
  enabled = true,
  onLoadStart,
  onLoadEnd,
  onCached,
}: UseVideoStreamOptions): VideoStreamState {
  const [url, setUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [progress, setProgress] = useState(0)
  const [isCached, setIsCached] = useState(false)

  const { getCachedFile, cacheFile } = useMediaCache()
  const abortControllerRef = useRef<AbortController | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const previousFileIdRef = useRef<string | null>(null)

  // Refs para callbacks (evitar recrear loadVideo en cada render)
  const onLoadStartRef = useRef(onLoadStart)
  const onLoadEndRef = useRef(onLoadEnd)
  const onCachedRef = useRef(onCached)

  const streamingRef = useRef<boolean>(false)
  const chunkSizeRef = useRef<number>(5 * 1024 * 1024) // 5MB chunks

  useEffect(() => {
    onLoadStartRef.current = onLoadStart
    onLoadEndRef.current = onLoadEnd
    onCachedRef.current = onCached
  }, [onLoadStart, onLoadEnd, onCached])

  const cleanupBlobUrl = useCallback(() => {
    if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }, [])

  const downloadWithProgress = useCallback(async (fileId: string, signal: AbortSignal): Promise<Blob | null> => {
    try {
      const response = await fetch(`/api/sftp/serve/${fileId}`, {
        signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        console.error("[WC] Server error for file:", fileId, errorData)
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader available")

      const chunks: Uint8Array<ArrayBuffer>[] = []
      const totalSize = Number.parseInt(response.headers.get("content-length") || "0")
      let receivedSize = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        receivedSize += value.length

        // Reportar progreso
        if (totalSize > 0) {
          setProgress(Math.round((receivedSize / totalSize) * 100))
        }
      }

      // Combinar chunks en un solo blob
      const blob = new Blob(chunks, { type: response.headers.get("content-type") || "video/mp4" })
      console.log("[WC] Downloaded video:", fileId, `(${(blob.size / 1024 / 1024).toFixed(2)}MB)`)

      return blob
    } catch (error) {
      console.error("[WC] Download error:", error)
      if (error instanceof Error && error.name !== "AbortError") {
        throw error
      }
      return null
    }
  }, [])

  const loadVideo = useCallback(async () => {
    if (!fileId || !enabled) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setIsLoading(true)
    setError(null)
    setProgress(0)

    if (onLoadStartRef.current) onLoadStartRef.current()

    try {
      // 1. Intentar cargar desde cache primero
      const cachedBlob = await getCachedFile(fileId)

      if (cachedBlob) {
        console.log("[WC] Using cached video:", fileId)
        if (!blobUrlRef.current || blobUrlRef.current === "") {
          const blobUrl = URL.createObjectURL(cachedBlob)
          blobUrlRef.current = blobUrl
          setUrl(blobUrl)

          if (onCachedRef.current) {
            onCachedRef.current(fileId, blobUrl)
          }
        } else {
          setUrl(blobUrlRef.current)
        }

        setIsCached(true)
        setProgress(100)
        setIsLoading(false)
        if (onLoadEndRef.current) onLoadEndRef.current()
        return
      }

      // 2. No está en cache, decidir estrategia
      setIsCached(false)
      abortControllerRef.current = new AbortController()

      const shouldCache = fileSize ? fileSize < 100 * 1024 * 1024 : true
      const isLargeFile = fileSize && fileSize > 100 * 1024 * 1024

      if (shouldCache && !isLargeFile) {
        // Descargar y cachear archivos pequeños/medianos
        console.log("[WC] Downloading and caching video:", fileId)
        const blob = await downloadWithProgress(fileId, abortControllerRef.current.signal)

        if (blob) {
          const blobUrl = URL.createObjectURL(blob)
          blobUrlRef.current = blobUrl
          setUrl(blobUrl)
          setProgress(100)

          // Cachear en background
          cacheFile(fileId, blob).catch((err) => {
            console.warn("[WC] Failed to cache video:", err)
          })

          if (onCachedRef.current) {
            onCachedRef.current(fileId, blobUrl)
          }
        }
      } else {
        console.log(
          "[WC] Using server streaming for large video:",
          fileId,
          `(${fileSize ? (fileSize / 1024 / 1024).toFixed(2) : "?"}MB)`,
        )
        const serverUrl = `/api/sftp/serve/${fileId}`
        setUrl(serverUrl)
        setProgress(100)
      }

      setIsLoading(false)
      if (onLoadEndRef.current) onLoadEndRef.current()
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          console.log("[WC] Video loading aborted:", fileId)
          return
        }

        setError(err)
        console.error("[WC] Error loading video:", err)
      }

      setIsLoading(false)
      if (onLoadEndRef.current) onLoadEndRef.current()
    }
  }, [fileId, fileSize, enabled, getCachedFile, cacheFile, downloadWithProgress])

  useEffect(() => {
    if (previousFileIdRef.current && previousFileIdRef.current !== fileId) {
      cleanupBlobUrl()
    }

    previousFileIdRef.current = fileId

    if (enabled) {
      loadVideo()
    }

    return () => {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        try {
          abortControllerRef.current.abort()
        } catch (error) {
          // Ignore abort errors
          console.log("[WC] Abort controller error:", error)
        }
      }
    }
  }, [fileId, enabled, loadVideo, cleanupBlobUrl])

  return {
    url,
    isLoading,
    error,
    progress,
    isCached,
  }
}
