"use client"

import { useCallback, useRef } from "react"
import type { SFTPConfig, FileMetadata } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB por chunk (límite seguro para Vercel)
const LARGE_FILE_THRESHOLD = 15 * 1024 * 1024 // 15MB - archivos mayores usan chunked upload

interface ChunkedUploadOptions {
  file: File
  config?: Partial<SFTPConfig>
  uploadBatchId?: string
  onProgress?: (progress: number, status: string) => void
}

interface ChunkedUploadResult {
  success: boolean
  file?: FileMetadata
  error?: string
}

export function useChunkedUpload() {
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  const uploadFile = useCallback(async ({
    file,
    config,
    uploadBatchId,
    onProgress,
  }: ChunkedUploadOptions): Promise<ChunkedUploadResult> => {
    const uploadId = uuidv4()
    const abortController = new AbortController()
    abortControllersRef.current.set(uploadId, abortController)

    try {
      // Decidir si usar chunked upload basado en el tamaño
      const useChunkedUpload = file.size > LARGE_FILE_THRESHOLD

      if (!useChunkedUpload) {
        // Para archivos pequeños, usar upload tradicional
        return await uploadSmallFile({ file, config, uploadBatchId, onProgress })
      }

      // Para archivos grandes, usar chunked upload
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
      onProgress?.(0, `Preparando subida (${totalChunks} partes)...`)

      // Subir cada chunk
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        // Verificar si se canceló
        if (abortController.signal.aborted) {
          throw new Error("Subida cancelada")
        }

        const start = chunkIndex * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)

        const formData = new FormData()
        formData.append("chunk", chunk)
        formData.append(
          "metadata",
          JSON.stringify({
            uploadId,
            chunkIndex,
            totalChunks,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          })
        )

        const response = await fetch("/api/sftp/upload-chunk", {
          method: "POST",
          body: formData,
          signal: abortController.signal,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || `Error subiendo parte ${chunkIndex + 1}`)
        }

        // Calcular progreso (dar 90% al upload de chunks, 10% a la finalización)
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 90)
        onProgress?.(progress, `Subiendo parte ${chunkIndex + 1}/${totalChunks}...`)
      }

      // Finalizar upload y ensamblar archivo en el servidor
      onProgress?.(90, "Finalizando subida...")

      const completeResponse = await fetch("/api/sftp/complete-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          totalChunks,
          config,
          uploadBatchId,
        }),
        signal: abortController.signal,
      })

      if (!completeResponse.ok) {
        const error = await completeResponse.json()
        throw new Error(error.message || "Error al finalizar subida")
      }

      const result = await completeResponse.json()
      onProgress?.(100, "¡Completado!")

      abortControllersRef.current.delete(uploadId)
      return {
        success: true,
        file: result.file,
      }
    } catch (error) {
      abortControllersRef.current.delete(uploadId)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }
    }
  }, [])

  const uploadSmallFile = useCallback(async ({
    file,
    config,
    uploadBatchId,
    onProgress,
  }: ChunkedUploadOptions): Promise<ChunkedUploadResult> => {
    try {
      onProgress?.(0, "Subiendo archivo...")

      const formData = new FormData()
      formData.append("files", file)
      
      if (config) {
        formData.append("config", JSON.stringify(config))
      }
      
      if (uploadBatchId) {
        formData.append("uploadBatchId", uploadBatchId)
      }

      const response = await fetch("/api/sftp/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al subir archivo")
      }

      const result = await response.json()
      onProgress?.(100, "¡Completado!")

      return {
        success: true,
        file: result.files?.[0],
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }
    }
  }, [])

  const cancelUpload = useCallback((uploadId: string) => {
    const controller = abortControllersRef.current.get(uploadId)
    if (controller) {
      controller.abort()
      abortControllersRef.current.delete(uploadId)
    }
  }, [])

  const cancelAllUploads = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort()
    })
    abortControllersRef.current.clear()
  }, [])

  return {
    uploadFile,
    cancelUpload,
    cancelAllUploads,
  }
}
