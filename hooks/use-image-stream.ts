"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useMediaCache } from "./use-media-cache"

interface UseImageStreamOptions {
  fileId: string
  fileSize?: number
  enabled?: boolean
  cachedUrl?: string
  onLoadStart?: () => void
  onLoadEnd?: () => void
  onCached?: (fileId: string, blobUrl: string) => void
}

interface ImageStreamState {
  url: string | null
  isLoading: boolean
  error: Error | null
  isCached: boolean
}

/**
 * Hook especializado para carga de imágenes con cache inteligente
 * 
 * Características:
 * - Prioriza URLs cacheadas existentes
 * - Precarga automática para imágenes pequeñas
 * - Gestión eficiente de memoria con blob URLs
 * - Manejo robusto de errores
 */
export function useImageStream({
  fileId,
  fileSize,
  enabled = true,
  cachedUrl,
  onLoadStart,
  onLoadEnd,
  onCached,
}: UseImageStreamOptions): ImageStreamState {
  const [url, setUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isCached, setIsCached] = useState(false)
  
  const { getCachedFile, cacheFile } = useMediaCache()
  const abortControllerRef = useRef<AbortController | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const previousFileIdRef = useRef<string | null>(null)
  
  // Refs para callbacks (evitar recrear loadImage en cada render)
  const onLoadStartRef = useRef(onLoadStart)
  const onLoadEndRef = useRef(onLoadEnd)
  const onCachedRef = useRef(onCached)
  
  // Actualizar refs cuando cambien los callbacks
  useEffect(() => {
    onLoadStartRef.current = onLoadStart
    onLoadEndRef.current = onLoadEnd
    onCachedRef.current = onCached
  }, [onLoadStart, onLoadEnd, onCached])

  // Función para limpiar blob URL anterior
  const cleanupBlobUrl = useCallback(() => {
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }, [])

  // Función principal de carga
  const loadImage = useCallback(async () => {
    if (!fileId || !enabled) return

    // Cancelar petición anterior si existe
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      try {
        abortControllerRef.current.abort()
      } catch (error) {
        console.log("[WC] Abort controller already aborted")
      }
    }

    // NO limpiar blob URL aquí - solo al desmontar o cambiar de archivo
    
    setIsLoading(true)
    setError(null)
    
    if (onLoadStartRef.current) onLoadStartRef.current()

    try {
      // 1. Si tenemos cachedUrl (del padre), usarla inmediatamente
      if (cachedUrl) {
        setUrl(cachedUrl)
        setIsCached(true)
        setIsLoading(false)
        if (onLoadEndRef.current) onLoadEndRef.current()
        return
      }

      // 2. Intentar cargar desde cache local
      const cachedBlob = await getCachedFile(fileId)
      
      if (cachedBlob) {
        // Solo crear nuevo blob URL si no existe o es diferente
        if (!blobUrlRef.current || blobUrlRef.current === '') {
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
        setIsLoading(false)
        if (onLoadEndRef.current) onLoadEndRef.current()
        return
      }

      // 3. No está en cache - decidir estrategia según tamaño
      const shouldPreload = !fileSize || fileSize < 5 * 1024 * 1024 // < 5MB

      if (shouldPreload) {
        // Precargar y cachear imágenes pequeñas
        abortControllerRef.current = new AbortController()
        
        const response = await fetch(`/api/sftp/serve/${fileId}`, {
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const blob = await response.blob()
        
        // Crear blob URL
        const blobUrl = URL.createObjectURL(blob)
        blobUrlRef.current = blobUrl
        setUrl(blobUrl)
        setIsCached(false)
        
        // Cachear en background
        cacheFile(fileId, blob).catch((err) => {
          console.warn('Failed to cache image:', err)
        })
        
        if (onCachedRef.current) {
          onCachedRef.current(fileId, blobUrl)
        }
      } else {
        // Imágenes grandes: usar URL directa del servidor
        const serverUrl = `/api/sftp/serve/${fileId}`
        setUrl(serverUrl)
        setIsCached(false)
      }

      setIsLoading(false)
      if (onLoadEndRef.current) onLoadEndRef.current()

    } catch (err) {
      if (err instanceof Error) {
        // Ignorar errores de abort
        if (err.name === 'AbortError') {
          return
        }
        
        setError(err)
        console.error('Error loading image:', err)
      }
      
      setIsLoading(false)
      if (onLoadEndRef.current) onLoadEndRef.current()
    }
  }, [fileId, fileSize, enabled, cachedUrl, getCachedFile, cacheFile])

  // Cargar imagen cuando cambie el fileId, cachedUrl o enabled
  useEffect(() => {
    // Si cambió el fileId, limpiar el blob URL anterior
    if (previousFileIdRef.current && previousFileIdRef.current !== fileId) {
      if (!cachedUrl) {
        cleanupBlobUrl()
      }
    }
    
    previousFileIdRef.current = fileId
    
    if (enabled) {
      loadImage()
    }

    // Cleanup solo al desmontar completamente
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
  }, [fileId, cachedUrl, enabled, loadImage, cleanupBlobUrl])

  return {
    url,
    isLoading,
    error,
    isCached,
  }
}
