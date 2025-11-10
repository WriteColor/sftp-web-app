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
 * 
 * Características:
 * - Prioriza cache antes de hacer peticiones de red
 * - Soporta streaming progresivo con range requests
 * - Maneja automáticamente la limpieza de blob URLs
 * - Reporta progreso de carga
 * - Gestión robusta de errores
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
  const loadVideo = useCallback(async () => {
    if (!fileId || !enabled) return

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // NO limpiar blob URL aquí - se limpia en el useEffect cuando cambia fileId
    
    setIsLoading(true)
    setError(null)
    setProgress(0)
    
    if (onLoadStartRef.current) onLoadStartRef.current()

    try {
      // 1. Intentar cargar desde cache primero
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
        setProgress(100)
        setIsLoading(false)
        if (onLoadEndRef.current) onLoadEndRef.current()
        return
      }

      // 2. No está en cache, cargar desde servidor
      setIsCached(false)
      abortControllerRef.current = new AbortController()

      const response = await fetch(`/api/sftp/serve/${fileId}`, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Determinar si cachear (solo archivos < 100MB)
      const shouldCache = fileSize ? fileSize < 100 * 1024 * 1024 : true
      
      if (shouldCache) {
        // 3. Cachear el video para uso futuro
        const blob = await response.blob()
        
        // Crear blob URL
        const blobUrl = URL.createObjectURL(blob)
        blobUrlRef.current = blobUrl
        setUrl(blobUrl)
        setProgress(100)
        
        // Cachear en background (no bloquear)
        cacheFile(fileId, blob).catch((err) => {
          console.warn('Failed to cache video:', err)
        })
        
        if (onCachedRef.current) {
          onCachedRef.current(fileId, blobUrl)
        }
      } else {
        // 4. Archivos grandes: usar URL directa (streaming del servidor)
        // El navegador manejará los range requests automáticamente
        const serverUrl = `/api/sftp/serve/${fileId}`
        setUrl(serverUrl)
        setProgress(100)
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
        console.error('Error loading video:', err)
      }
      
      setIsLoading(false)
      if (onLoadEndRef.current) onLoadEndRef.current()
    }
  }, [fileId, fileSize, enabled, getCachedFile, cacheFile, cleanupBlobUrl])

  // Cargar video cuando cambie el fileId o enabled
  useEffect(() => {
    // Si cambió el fileId, limpiar el blob URL anterior
    if (previousFileIdRef.current && previousFileIdRef.current !== fileId) {
      cleanupBlobUrl()
    }
    
    previousFileIdRef.current = fileId
    
    if (enabled) {
      loadVideo()
    }

    // Cleanup solo al desmontar completamente
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
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
