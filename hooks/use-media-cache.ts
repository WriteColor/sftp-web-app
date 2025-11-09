"use client"

import { useState, useCallback } from "react"

interface CacheEntry {
  data: Blob
  timestamp: number
  size: number
}

const DB_NAME = "SFTPClientDB"
const STORE_NAME = "mediaCache"
const MAX_CACHE_SIZE = 500 * 1024 * 1024 // 500MB max cache
const MAX_ENTRY_AGE = 30 * 24 * 60 * 60 * 1000 // 30 days

export function useMediaCache() {
  const [dbReady, setDbReady] = useState(false)
  const [cacheSize, setCacheSize] = useState(0)

  const initDB = useCallback(async () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        setDbReady(true)
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" })
        }
      }
    })
  }, [])

  const getCachedFile = useCallback(
    async (fileId: string): Promise<Blob | null> => {
      try {
        const db = await initDB()
        return new Promise((resolve) => {
          const transaction = db.transaction(STORE_NAME, "readonly")
          const store = transaction.objectStore(STORE_NAME)
          const request = store.get(fileId)

          request.onsuccess = () => {
            const entry = request.result as CacheEntry | undefined
            if (entry) {
              const age = Date.now() - entry.timestamp
              if (age > MAX_ENTRY_AGE) {
                // Remove expired entry
                deleteCachedFile(fileId)
                resolve(null)
              } else {
                resolve(entry.data)
              }
            } else {
              resolve(null)
            }
          }
          request.onerror = () => resolve(null)
        })
      } catch {
        return null
      }
    },
    [initDB],
  )

  const cacheFile = useCallback(
    async (fileId: string, blob: Blob) => {
      try {
        const db = await initDB()
        const blobSize = blob.size

        // Check if adding this file would exceed max cache
        const currentSize = await getCacheSize()
        if (currentSize + blobSize > MAX_CACHE_SIZE) {
          await cleanOldestEntries(blobSize)
        }

        return new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, "readwrite")
          const store = transaction.objectStore(STORE_NAME)
          const entry: CacheEntry = {
            data: blob,
            timestamp: Date.now(),
            size: blobSize,
          }

          const request = store.put({ id: fileId, ...entry })
          request.onsuccess = () => {
            setCacheSize((prev) => prev + blobSize)
            resolve()
          }
          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.error("Cache error:", error)
      }
    },
    [initDB],
  )

  const deleteCachedFile = useCallback(
    async (fileId: string) => {
      try {
        const db = await initDB()
        return new Promise<void>((resolve) => {
          const transaction = db.transaction(STORE_NAME, "readwrite")
          const store = transaction.objectStore(STORE_NAME)
          const request = store.delete(fileId)

          request.onsuccess = () => resolve()
          request.onerror = () => resolve()
        })
      } catch {
        return
      }
    },
    [initDB],
  )

  const getCacheSize = useCallback(async (): Promise<number> => {
    try {
      const db = await initDB()
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, "readonly")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onsuccess = () => {
          const entries = request.result as (CacheEntry & { id: string })[]
          const total = entries.reduce((sum, entry) => sum + entry.size, 0)
          resolve(total)
        }
        request.onerror = () => resolve(0)
      })
    } catch {
      return 0
    }
  }, [initDB])

  const cleanOldestEntries = useCallback(
    async (requiredSpace: number) => {
      try {
        const db = await initDB()
        return new Promise<void>((resolve) => {
          const transaction = db.transaction(STORE_NAME, "readonly")
          const store = transaction.objectStore(STORE_NAME)
          const request = store.getAll()

          request.onsuccess = () => {
            const entries = request.result as (CacheEntry & { id: string })[]
            // Sort by timestamp (oldest first)
            entries.sort((a, b) => a.timestamp - b.timestamp)

            let freedSpace = 0
            const toDelete: string[] = []

            for (const entry of entries) {
              if (freedSpace >= requiredSpace) break
              toDelete.push(entry.id)
              freedSpace += entry.size
            }

            // Delete oldest entries
            const deleteTransaction = db.transaction(STORE_NAME, "readwrite")
            const deleteStore = deleteTransaction.objectStore(STORE_NAME)

            toDelete.forEach((id) => {
              deleteStore.delete(id)
            })

            deleteTransaction.oncomplete = () => resolve()
          }
          request.onerror = () => resolve()
        })
      } catch {
        return
      }
    },
    [initDB],
  )

  return {
    getCachedFile,
    cacheFile,
    deleteCachedFile,
    getCacheSize,
    dbReady,
  }
}
