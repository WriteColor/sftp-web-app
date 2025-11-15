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

      // Para archivos grandes, usar chunked upload con streaming directo
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
      onProgress?.(0, `Preparando subida (${totalChunks} partes)...`)

      // Dividir archivo en chunks y subirlos secuencialmente
      // En Vercel, usamos un enfoque de streaming directo para evitar
      // problemas de persistencia de archivos temporales entre funciones
      const chunks: Blob[] = []
      
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        chunks.push(file.slice(start, end))
        
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 30)
        onProgress?.(progress, `Preparando parte ${chunkIndex + 1}/${totalChunks}...`)
      }

      // Subir todos los chunks en una sola llamada usando FormData
      onProgress?.(30, "Subiendo archivo...")
      
      const formData = new FormData()
      
      // Agregar cada chunk como un archivo separado
      chunks.forEach((chunk, index) => {
        formData.append(`chunk_${index}`, chunk, `chunk_${index}`)
      })
      
      // Agregar metadata
      formData.append("metadata", JSON.stringify({
        uploadId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        totalChunks,
        config,
        uploadBatchId,
      }))

      // Enviar todo en una sola llamada con streaming
      const completeResponse = await fetch("/api/sftp/upload-stream", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      })

      if (!completeResponse.ok) {
        let errorMessage = "Error al subir archivo"
        try {
          const error = await completeResponse.json()
          errorMessage = error.message || errorMessage
        } catch {
          errorMessage = `Error ${completeResponse.status}: ${completeResponse.statusText}`
        }
        throw new Error(errorMessage)
      }

      onProgress?.(90, "Finalizando...")
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
