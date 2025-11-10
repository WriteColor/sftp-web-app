"use client"

import { useCallback, useRef, useEffect } from "react"

// Nombre del cache para la Cache API
const CACHE_NAME = "sftp-media-cache-v1"
const MAX_MEMORY_CACHE_SIZE = 50 * 1024 * 1024 // 50MB max para caché en memoria
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000 // 7 días

// Caché en memoria como fallback
interface MemoryCacheEntry {
  blob: Blob
  timestamp: number
  size: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()
let memoryCacheSize = 0

export function useMediaCache() {
  const cacheApiAvailableRef = useRef<boolean | null>(null)
  const pendingOperationsRef = useRef(new Set<string>())

  // Verificar si Cache API está disponible
  const isCacheApiAvailable = useCallback(() => {
    if (cacheApiAvailableRef.current !== null) {
      return cacheApiAvailableRef.current
    }
    const available = typeof window !== "undefined" && "caches" in window
    cacheApiAvailableRef.current = available
    return available
  }, [])

  // Generar URL de caché única para cada archivo
  const getCacheUrl = useCallback((fileId: string) => {
    return `sftp-cache://media/${fileId}`
  }, [])

  // Obtener archivo de la caché
  const getCachedFile = useCallback(
    async (fileId: string): Promise<Blob | null> => {
      // Evitar operaciones duplicadas
      if (pendingOperationsRef.current.has(`get-${fileId}`)) {
        return null
      }

      try {
        // 1. Primero revisar caché en memoria (más rápido)
        const memEntry = memoryCache.get(fileId)
        if (memEntry) {
          const age = Date.now() - memEntry.timestamp
          if (age < MAX_CACHE_AGE) {
            return memEntry.blob
          } else {
            // Expirado, limpiar
            memoryCacheSize -= memEntry.size
            memoryCache.delete(fileId)
          }
        }

        // 2. Intentar Cache API si está disponible
        if (isCacheApiAvailable()) {
          pendingOperationsRef.current.add(`get-${fileId}`)
          
          const cache = await caches.open(CACHE_NAME)
          const cacheUrl = getCacheUrl(fileId)
          const response = await cache.match(cacheUrl)

          pendingOperationsRef.current.delete(`get-${fileId}`)

          if (response) {
            // Verificar edad del cache con header personalizado
            const cachedTime = response.headers.get("X-Cache-Time")
            if (cachedTime) {
              const age = Date.now() - parseInt(cachedTime)
              if (age > MAX_CACHE_AGE) {
                // Expirado, eliminar
                await cache.delete(cacheUrl)
                return null
              }
            }

            const blob = await response.blob()
            
            // Agregar a caché en memoria para acceso más rápido
            if (blob.size < MAX_MEMORY_CACHE_SIZE) {
              memoryCache.set(fileId, {
                blob,
                timestamp: Date.now(),
                size: blob.size,
              })
              memoryCacheSize += blob.size
            }

            return blob
          }
        }

        return null
      } catch (error) {
        pendingOperationsRef.current.delete(`get-${fileId}`)
        // Error silencioso, retornar null
        return null
      }
    },
    [isCacheApiAvailable, getCacheUrl],
  )

  // Cachear archivo (no bloquea el thread principal)
  const cacheFile = useCallback(
    async (fileId: string, blob: Blob) => {
      // Evitar operaciones duplicadas
      if (pendingOperationsRef.current.has(`set-${fileId}`)) {
        return
      }

      const blobSize = blob.size

      // Usar requestIdleCallback para operaciones de caché (no bloquea UI)
      const performCache = async () => {
        try {
          // 1. Agregar a caché en memoria si es pequeño
          if (blobSize < MAX_MEMORY_CACHE_SIZE / 2) {
            // Limpiar memoria si es necesario
            while (
              memoryCacheSize + blobSize > MAX_MEMORY_CACHE_SIZE &&
              memoryCache.size > 0
            ) {
              let oldestKey: string | null = null
              let oldestTime = Date.now()

              for (const [key, value] of memoryCache.entries()) {
                if (value.timestamp < oldestTime) {
                  oldestTime = value.timestamp
                  oldestKey = key
                }
              }

              if (oldestKey) {
                const deletedEntry = memoryCache.get(oldestKey)
                if (deletedEntry) {
                  memoryCacheSize -= deletedEntry.size
                  memoryCache.delete(oldestKey)
                }
              } else {
                break
              }
            }

            memoryCache.set(fileId, {
              blob,
              timestamp: Date.now(),
              size: blobSize,
            })
            memoryCacheSize += blobSize
          }

          // 2. Intentar Cache API para persistencia
          if (isCacheApiAvailable()) {
            pendingOperationsRef.current.add(`set-${fileId}`)

            const cache = await caches.open(CACHE_NAME)
            const cacheUrl = getCacheUrl(fileId)

            // Crear Response con headers personalizados
            const response = new Response(blob, {
              headers: {
                "Content-Type": blob.type || "application/octet-stream",
                "X-Cache-Time": Date.now().toString(),
                "X-File-Size": blobSize.toString(),
              },
            })

            await cache.put(cacheUrl, response)
            pendingOperationsRef.current.delete(`set-${fileId}`)
          }
        } catch (error) {
          pendingOperationsRef.current.delete(`set-${fileId}`)
          // Error silencioso
        }
      }

      // Usar requestIdleCallback si está disponible, sino setTimeout
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => {
          performCache()
        })
      } else {
        setTimeout(performCache, 0)
      }
    },
    [isCacheApiAvailable, getCacheUrl],
  )

  // Eliminar archivo de la caché
  const deleteCachedFile = useCallback(
    async (fileId: string) => {
      try {
        // Eliminar de memoria
        const memEntry = memoryCache.get(fileId)
        if (memEntry) {
          memoryCacheSize -= memEntry.size
          memoryCache.delete(fileId)
        }

        // Eliminar de Cache API
        if (isCacheApiAvailable()) {
          const cache = await caches.open(CACHE_NAME)
          const cacheUrl = getCacheUrl(fileId)
          await cache.delete(cacheUrl)
        }
      } catch {
        // Error silencioso
      }
    },
    [isCacheApiAvailable, getCacheUrl],
  )

  // Limpiar caché completa
  const clearCache = useCallback(async () => {
    try {
      // Limpiar memoria
      memoryCache.clear()
      memoryCacheSize = 0

      // Limpiar Cache API
      if (isCacheApiAvailable()) {
        await caches.delete(CACHE_NAME)
      }
    } catch {
      // Error silencioso
    }
  }, [isCacheApiAvailable])

  // Obtener tamaño estimado de la caché
  const getCacheSize = useCallback(async (): Promise<number> => {
    try {
      let totalSize = memoryCacheSize

      if (isCacheApiAvailable()) {
        const cache = await caches.open(CACHE_NAME)
        const keys = await cache.keys()

        for (const request of keys) {
          try {
            const response = await cache.match(request)
            if (response) {
              const sizeHeader = response.headers.get("X-File-Size")
              if (sizeHeader) {
                totalSize += parseInt(sizeHeader)
              }
            }
          } catch {
            // Ignorar errores individuales
          }
        }
      }

      return totalSize
    } catch {
      return memoryCacheSize
    }
  }, [isCacheApiAvailable])

  // Limpiar caché expirada en segundo plano
  useEffect(() => {
    if (typeof window === "undefined") return

    const cleanExpiredCache = async () => {
      try {
        if (!isCacheApiAvailable()) return

        const cache = await caches.open(CACHE_NAME)
        const keys = await cache.keys()
        const now = Date.now()

        for (const request of keys) {
          try {
            const response = await cache.match(request)
            if (response) {
              const cachedTime = response.headers.get("X-Cache-Time")
              if (cachedTime) {
                const age = now - parseInt(cachedTime)
                if (age > MAX_CACHE_AGE) {
                  await cache.delete(request)
                }
              }
            }
          } catch {
            // Ignorar errores individuales
          }
        }
      } catch {
        // Error silencioso
      }
    }

    // Limpiar caché expirada después de 5 segundos
    const timeoutId = setTimeout(cleanExpiredCache, 5000)
    return () => clearTimeout(timeoutId)
  }, [isCacheApiAvailable])

  return {
    getCachedFile,
    cacheFile,
    deleteCachedFile,
    clearCache,
    getCacheSize,
  }
}
