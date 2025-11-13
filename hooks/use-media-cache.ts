"use client"

import { useCallback, useRef, useEffect } from "react"

// Nombre del cache para la Cache API y IndexedDB
const CACHE_NAME = "sftp-media-cache-v2"
const INDEXEDDB_NAME = "sftp-media-store"
const INDEXEDDB_STORE = "files"
const MAX_MEMORY_CACHE_SIZE = 50 * 1024 * 1024 // 50MB max para caché en memoria
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000 // 7 días
const MAX_INDEXEDDB_SIZE = 500 * 1024 * 1024 // 500MB max para IndexedDB

interface MemoryCacheEntry {
  blob: Blob
  timestamp: number
  size: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()
let memoryCacheSize = 0

async function initIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        resolve(null)
        return
      }

      const request = window.indexedDB.open(INDEXEDDB_NAME, 1)

      request.onerror = () => {
        console.error("IndexedDB error:", request.error)
        resolve(null)
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
          const store = db.createObjectStore(INDEXEDDB_STORE, { keyPath: "id" })
          store.createIndex("timestamp", "timestamp", { unique: false })
        }
      }
    } catch (error) {
      console.error("IndexedDB initialization error:", error)
      resolve(null)
    }
  })
}

export function useMediaCache() {
  const cacheApiAvailableRef = useRef<boolean | null>(null)
  const indexedDBRef = useRef<IDBDatabase | null>(null)
  const pendingOperationsRef = useRef(new Set<string>())
  const initPromiseRef = useRef<Promise<IDBDatabase | null> | null>(null)

  // Verificar si Cache API está disponible
  const isCacheApiAvailable = useCallback(() => {
    if (cacheApiAvailableRef.current !== null) {
      return cacheApiAvailableRef.current
    }
    const available = typeof window !== "undefined" && "caches" in window
    cacheApiAvailableRef.current = available
    return available
  }, [])

  const getIndexedDB = useCallback(async (): Promise<IDBDatabase | null> => {
    if (indexedDBRef.current) {
      return indexedDBRef.current
    }

    if (!initPromiseRef.current) {
      initPromiseRef.current = initIndexedDB()
    }

    const db = await initPromiseRef.current
    if (db) {
      indexedDBRef.current = db
    }
    return db
  }, [])

  // Generar URL de caché única para cada archivo
  const getCacheUrl = useCallback((fileId: string) => {
    return new URL(
      `/api/cache/${fileId}`,
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
    ).toString()
  }, [])

  const getCachedFile = useCallback(
    async (fileId: string): Promise<Blob | null> => {
      // Evitar operaciones duplicadas
      if (pendingOperationsRef.current.has(`get-${fileId}`)) {
        return null
      }

      try {
        pendingOperationsRef.current.add(`get-${fileId}`)

        // 1. Primero revisar caché en memoria (más rápido)
        const memEntry = memoryCache.get(fileId)
        if (memEntry) {
          const age = Date.now() - memEntry.timestamp
          if (age < MAX_CACHE_AGE) {
            pendingOperationsRef.current.delete(`get-${fileId}`)
            return memEntry.blob
          } else {
            // Expirado, limpiar
            memoryCacheSize -= memEntry.size
            memoryCache.delete(fileId)
          }
        }

        // 2. Buscar en IndexedDB (persistencia única)
        const db = await getIndexedDB()
        if (db) {
          try {
            const blob = await new Promise<Blob | null>((resolve) => {
              try {
                const transaction = db.transaction([INDEXEDDB_STORE], "readonly")
                const store = transaction.objectStore(INDEXEDDB_STORE)
                const request = store.get(fileId)

                request.onsuccess = () => {
                  const result = request.result
                  if (result && result.data) {
                    const age = Date.now() - result.timestamp
                    if (age < MAX_CACHE_AGE) {
                      const blobData = result.data
                      const reconstructedBlob = new Blob([blobData], {
                        type: result.mimeType || "application/octet-stream",
                      })
                      
                      // Agregar a caché en memoria para acceso más rápido
                      if (reconstructedBlob.size < MAX_MEMORY_CACHE_SIZE / 2) {
                        memoryCache.set(fileId, {
                          blob: reconstructedBlob,
                          timestamp: Date.now(),
                          size: reconstructedBlob.size,
                        })
                        memoryCacheSize += reconstructedBlob.size
                      }
                      
                      resolve(reconstructedBlob)
                      return
                    } else {
                      // Expirado, eliminar
                      const deleteTransaction = db.transaction([INDEXEDDB_STORE], "readwrite")
                      const deleteStore = deleteTransaction.objectStore(INDEXEDDB_STORE)
                      deleteStore.delete(fileId)
                    }
                  }
                  resolve(null)
                }

                request.onerror = () => {
                  console.error("IndexedDB read error:", request.error)
                  resolve(null)
                }
              } catch (error) {
                console.error("IndexedDB transaction error:", error)
                resolve(null)
              }
            })

            if (blob) {
              pendingOperationsRef.current.delete(`get-${fileId}`)
              return blob
            }
          } catch (error) {
            console.error("IndexedDB retrieval failed:", error)
          }
        }

        pendingOperationsRef.current.delete(`get-${fileId}`)
        return null
      } catch (error) {
        console.error("[WC] Cache retrieval error:", error)
        pendingOperationsRef.current.delete(`get-${fileId}`)
        return null
      }
    },
    [getIndexedDB],
  )

  const cacheFile = useCallback(
    async (fileId: string, blob: Blob) => {
      // Evitar operaciones duplicadas
      if (pendingOperationsRef.current.has(`set-${fileId}`)) {
        console.log("[WC] Skipping duplicate cache operation for:", fileId)
        return
      }

      const blobSize = blob.size

      const performCache = async () => {
        try {
          pendingOperationsRef.current.add(`set-${fileId}`)

          // 1. Agregar a caché en memoria si es pequeño
          if (blobSize < MAX_MEMORY_CACHE_SIZE / 2) {
            // Limpiar memoria si es necesario
            while (memoryCacheSize + blobSize > MAX_MEMORY_CACHE_SIZE && memoryCache.size > 0) {
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

          // 2. Guardar en IndexedDB para persistencia (única fuente de caché persistente)
          const db = await getIndexedDB()
          if (db) {
            try {
              const arrayBuffer = await blob.arrayBuffer()

              const data = {
                id: fileId,
                data: arrayBuffer,
                timestamp: Date.now(),
                mimeType: blob.type || "application/octet-stream",
                size: blobSize,
              }

              await new Promise<void>((resolve, reject) => {
                try {
                  const transaction = db.transaction([INDEXEDDB_STORE], "readwrite")
                  const store = transaction.objectStore(INDEXEDDB_STORE)

                  const request = store.put(data)

                  request.onsuccess = () => {
                    resolve()
                  }

                  request.onerror = () => {
                    console.error("[WC] IndexedDB save error:", request.error)
                    reject(request.error)
                  }

                  transaction.onerror = () => {
                    console.error("[WC] IndexedDB transaction error:", transaction.error)
                    reject(transaction.error)
                  }
                } catch (error) {
                  console.error("[WC] IndexedDB save failed:", error)
                  reject(error)
                }
              })
            } catch (error) {
              console.error("[WC] IndexedDB operation failed:", error)
            }
          }

          pendingOperationsRef.current.delete(`set-${fileId}`)
        } catch (error) {
          console.error("[WC] Cache operation error:", error)
          pendingOperationsRef.current.delete(`set-${fileId}`)
        }
      }

      performCache()
    },
    [getIndexedDB],
  )

  const deleteCachedFile = useCallback(
    async (fileId: string) => {
      try {
        // Eliminar de memoria
        const memEntry = memoryCache.get(fileId)
        if (memEntry) {
          memoryCacheSize -= memEntry.size
          memoryCache.delete(fileId)
        }

        // Eliminar de IndexedDB
        const db = await getIndexedDB()
        if (db) {
          const transaction = db.transaction([INDEXEDDB_STORE], "readwrite")
          const store = transaction.objectStore(INDEXEDDB_STORE)
          store.delete(fileId)
        }

        console.log("[WC] File deleted from cache:", fileId)
      } catch (error) {
        console.error("[WC] Cache deletion error:", error)
      }
    },
    [getIndexedDB],
  )

  // Limpiar archivo de la caché
  const clearCache = useCallback(async () => {
    try {
      // Limpiar memoria
      memoryCache.clear()
      memoryCacheSize = 0

      // Limpiar IndexedDB
      const db = await getIndexedDB()
      if (db) {
        const transaction = db.transaction([INDEXEDDB_STORE], "readwrite")
        const store = transaction.objectStore(INDEXEDDB_STORE)
        store.clear()
      }

      console.log("[WC] Cache cleared completely")
    } catch (error) {
      console.error("[WC] Cache clear error:", error)
    }
  }, [getIndexedDB])

  // Obtener tamaño estimado de la caché
  const getCacheSize = useCallback(async (): Promise<number> => {
    try {
      let totalSize = memoryCacheSize

      // Contar tamaño en IndexedDB
      const db = await getIndexedDB()
      if (db) {
        totalSize += await new Promise<number>((resolve) => {
          try {
            const transaction = db.transaction([INDEXEDDB_STORE], "readonly")
            const store = transaction.objectStore(INDEXEDDB_STORE)
            const request = store.getAll()

            request.onsuccess = () => {
              let idbSize = 0
              for (const item of request.result) {
                if (item.data) {
                  idbSize += item.size || 0
                }
              }
              console.log("[WC] IndexedDB size:", `${(idbSize / 1024 / 1024).toFixed(2)}MB`)
              resolve(idbSize)
            }

            request.onerror = () => resolve(0)
          } catch {
            resolve(0)
          }
        })
      }

      console.log("[WC] Total cache size:", `${(totalSize / 1024 / 1024).toFixed(2)}MB`)
      return totalSize
    } catch (error) {
      console.error("[WC] Cache size calculation error:", error)
      return memoryCacheSize
    }
  }, [getIndexedDB])

  // Limpiar caché expirada en segundo plano
  useEffect(() => {
    if (typeof window === "undefined") return

    const cleanExpiredCache = async () => {
      try {
        const db = await getIndexedDB()
        if (db) {
          const now = Date.now()
          const transaction = db.transaction([INDEXEDDB_STORE], "readwrite")
          const store = transaction.objectStore(INDEXEDDB_STORE)
          const index = store.index("timestamp")
          const range = IDBKeyRange.upperBound(now - MAX_CACHE_AGE)

          const request = index.openCursor(range)
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result
            if (cursor) {
              console.log("[WC] Deleting expired entry:", cursor.key)
              store.delete(cursor.key)
              cursor.continue()
            }
          }
        }
      } catch (error) {
        console.error("[WC] Expired cache cleanup error:", error)
      }
    }

    const timeoutId = setTimeout(cleanExpiredCache, 5000)
    return () => clearTimeout(timeoutId)
  }, [getIndexedDB])

  return {
    getCachedFile,
    cacheFile,
    deleteCachedFile,
    clearCache,
    getCacheSize,
  }
}
