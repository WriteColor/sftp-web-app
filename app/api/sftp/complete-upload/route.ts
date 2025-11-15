import { type NextRequest, NextResponse } from "next/server"
import { createSFTPConnection } from "@/lib/sftp-settings/sftp-client"
import { createServerClient } from "@/lib/supabase/server"
import type { SFTPConfig, FileMetadata } from "@/lib/types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { randomBytes } from "crypto"
import path from "path"
import { validateSFTPConfig, sanitizeFilename } from "@/lib/sftp-settings/validation"
import { rateLimit } from "@/lib/sftp-settings/rate-limit"
import { getServerSFTPConfig } from "@/lib/sftp-settings/sftp-config"
import { secureJsonResponse, isValidUUID } from "@/lib/security"

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

// Helper para limpiar chunks temporales de Supabase
async function cleanupSupabaseChunks(supabase: SupabaseClient, uploadId: string, totalChunks: number) {
  try {
    const filesToDelete = []
    for (let i = 0; i < totalChunks; i++) {
      filesToDelete.push(`${uploadId}_chunk_${i}`)
    }
    await supabase.storage.from('chunks-temp').remove(filesToDelete)
    console.log(`[Complete Upload] Limpiados ${filesToDelete.length} chunks temporales`)
  } catch (error) {
    console.error("[Complete Upload] Error limpiando chunks:", error)
  }
}

// Timeout amplio para finalización (ensamblar chunks y subir)
export const maxDuration = 60 // 60 segundos
export const dynamic = 'force-dynamic'

interface CompleteUploadRequest {
  uploadId: string
  fileName: string
  fileSize: number
  mimeType: string
  totalChunks: number
  config?: Partial<SFTPConfig>
  uploadBatchId?: string
}

export async function POST(request: NextRequest) {
  let sftp: any = null

  try {
    // Obtener cliente de Supabase al inicio
    const supabase = await createServerClient()

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    // Rate limit generoso para finalizaciones: 30 archivos por minuto
    // Permite múltiples archivos grandes simultáneos + reintentos automáticos
    if (!rateLimit(ip, 30, 60000)) {
      return secureJsonResponse(
        { success: false, message: "Demasiadas solicitudes. Intenta más tarde." },
        { status: 429 }
      )
    }

    const body: CompleteUploadRequest = await request.json()
    const { uploadId, fileName, fileSize, mimeType, totalChunks, config: partialConfig, uploadBatchId } = body

    // Validar UUID del batch si existe
    if (uploadBatchId && !isValidUUID(uploadBatchId)) {
      return secureJsonResponse(
        { success: false, message: "ID de lote inválido" },
        { status: 400 }
      )
    }

    // Validar tamaño
    if (fileSize > MAX_FILE_SIZE) {
      return secureJsonResponse(
        { success: false, message: "Archivo demasiado grande (máx 500MB)" },
        { status: 400 }
      )
    }

    // Obtener configuración SFTP
    let config: SFTPConfig
    if (partialConfig) {
      config = getServerSFTPConfig(partialConfig)
    } else {
      config = getServerSFTPConfig()
    }

    if (!validateSFTPConfig(config)) {
      return secureJsonResponse(
        { success: false, message: "Configuración SFTP inválida" },
        { status: 400 }
      )
    }

    // Ensamblar chunks en orden desde Supabase Storage
    const chunks: Buffer[] = []
    let totalSize = 0

    console.log(`[Complete Upload] Descargando ${totalChunks} chunks desde Supabase...`)

    for (let i = 0; i < totalChunks; i++) {
      const chunkFileName = `${uploadId}_chunk_${i}`
      
      try {
        const { data: chunkData, error: downloadError } = await supabase.storage
          .from('chunks-temp')
          .download(chunkFileName)

        if (downloadError || !chunkData) {
          console.error(`[Complete Upload] Error descargando chunk ${i}:`, downloadError)
          // Intentar limpiar chunks existentes
          await cleanupSupabaseChunks(supabase, uploadId, totalChunks)
          return secureJsonResponse(
            { success: false, message: `Chunk ${i} faltante o corrupto` },
            { status: 400 }
          )
        }

        const chunkBuffer = Buffer.from(await chunkData.arrayBuffer())
        chunks.push(chunkBuffer)
        totalSize += chunkBuffer.length
      } catch (error) {
        console.error(`[Complete Upload] Error procesando chunk ${i}:`, error)
        await cleanupSupabaseChunks(supabase, uploadId, totalChunks)
        return secureJsonResponse(
          { success: false, message: `Chunk ${i} faltante o corrupto` },
          { status: 400 }
        )
      }
    }

    // Verificar que el tamaño coincida
    if (totalSize !== fileSize) {
      await cleanupSupabaseChunks(supabase, uploadId, totalChunks)
      return secureJsonResponse(
        { 
          success: false, 
          message: `Tamaño de archivo no coincide. Esperado: ${fileSize}, Recibido: ${totalSize}` 
        },
        { status: 400 }
      )
    }

    // Combinar todos los chunks
    const completeBuffer = Buffer.concat(chunks)

    // Conectar al servidor SFTP
    sftp = await createSFTPConnection(config)

    // Crear directorio de uploads si no existe
    const uploadDir = "/uploads/sftp-web-app"
    try {
      await sftp.mkdir(uploadDir, true)
    } catch (error) {
      // El directorio ya existe, continuar
    }

    // Sanitizar nombre y generar nombre único
    const sanitizedName = sanitizeFilename(fileName)
    const fileExt = path.extname(sanitizedName)
    const uniqueName = `${randomBytes(16).toString("hex")}${fileExt}`
    const remotePath = `${uploadDir}/${uniqueName}`

    // Subir archivo completo al servidor SFTP
    await sftp.put(completeBuffer, remotePath)

    // Guardar metadata en Supabase
    const metadata: any = {
      filename: uniqueName,
      original_filename: sanitizedName,
      file_path: remotePath,
      file_size: fileSize,
      mime_type: mimeType || "application/octet-stream",
    }

    if (uploadBatchId) {
      metadata.upload_batch_id = uploadBatchId
    }

    const { data, error } = await supabase.from("files").insert(metadata).select().single()

    if (error) {
      console.error("[Complete Upload] Error guardando metadata:", error)
      // Intentar eliminar el archivo del SFTP si falló la metadata
      try {
        await sftp.delete(remotePath)
      } catch (e) {
        console.error("[Complete Upload] Error eliminando archivo de SFTP:", e)
      }
      
      await cleanupSupabaseChunks(supabase, uploadId, totalChunks)
      await sftp.end()
      
      return secureJsonResponse(
        { success: false, message: "Error al guardar metadata del archivo" },
        { status: 500 }
      )
    }

    // Cerrar conexión SFTP
    await sftp.end()

    // Limpiar chunks temporales de Supabase
    await cleanupSupabaseChunks(supabase, uploadId, totalChunks)

    return secureJsonResponse({
      success: true,
      message: "Archivo subido exitosamente",
      file: data as FileMetadata,
    })
  } catch (error) {
    console.error("[WC] Error in complete-upload route:", error)

    if (sftp) {
      try {
        await sftp.end()
      } catch (e) {
        // Ignorar errores al cerrar
      }
    }

    return secureJsonResponse(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al completar subida",
      },
      { status: 500 }
    )
  }
}


