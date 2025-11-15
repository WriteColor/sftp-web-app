import { type NextRequest, NextResponse } from "next/server"
import { createSFTPConnection } from "@/lib/sftp-settings/sftp-client"
import { createServerClient } from "@/lib/supabase/server"
import type { SFTPConfig, FileMetadata } from "@/lib/types"
import { randomBytes } from "crypto"
import path from "path"
import { validateSFTPConfig, sanitizeFilename } from "@/lib/sftp-settings/validation"
import { rateLimit } from "@/lib/sftp-settings/rate-limit"
import { getServerSFTPConfig } from "@/lib/sftp-settings/sftp-config"
import { secureJsonResponse, isValidUUID } from "@/lib/security"

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

// Timeout amplio para upload completo con streaming
export const maxDuration = 300 // 5 minutos para archivos grandes
export const dynamic = 'force-dynamic'

interface UploadMetadata {
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
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    
    // Rate limit para uploads completos: 10 archivos por minuto
    if (!rateLimit(ip, 10, 60000)) {
      return secureJsonResponse(
        { success: false, message: "Demasiadas solicitudes. Intenta más tarde." },
        { status: 429 }
      )
    }

    // Parsear FormData
    const formData = await request.formData()
    
    // Obtener metadata
    const metadataStr = formData.get("metadata") as string
    if (!metadataStr) {
      return secureJsonResponse(
        { success: false, message: "Metadata faltante" },
        { status: 400 }
      )
    }

    const metadata: UploadMetadata = JSON.parse(metadataStr)
    const { uploadId, fileName, fileSize, mimeType, totalChunks, config: partialConfig, uploadBatchId } = metadata

    // Validar UUID del batch si existe
    if (uploadBatchId && !isValidUUID(uploadBatchId)) {
      return secureJsonResponse(
        { success: false, message: "ID de batch inválido" },
        { status: 400 }
      )
    }

    // Validar tamaño
    if (fileSize > MAX_FILE_SIZE) {
      return secureJsonResponse(
        { success: false, message: `Archivo muy grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      )
    }

    // Obtener configuración SFTP
    let config: SFTPConfig
    if (partialConfig) {
      config = { ...getServerSFTPConfig(), ...partialConfig }
    } else {
      config = getServerSFTPConfig()
    }

    if (!validateSFTPConfig(config)) {
      return secureJsonResponse(
        { success: false, message: "Configuración SFTP inválida" },
        { status: 400 }
      )
    }

    // Recolectar y ensamblar todos los chunks
    const chunks: Buffer[] = []
    let totalSize = 0

    console.log(`[Stream Upload] Ensamblando ${totalChunks} chunks para ${fileName}`)

    for (let i = 0; i < totalChunks; i++) {
      const chunkBlob = formData.get(`chunk_${i}`) as Blob
      
      if (!chunkBlob) {
        return secureJsonResponse(
          { success: false, message: `Chunk ${i} faltante` },
          { status: 400 }
        )
      }

      const chunkBuffer = Buffer.from(await chunkBlob.arrayBuffer())
      chunks.push(chunkBuffer)
      totalSize += chunkBuffer.length
    }

    // Verificar que el tamaño coincida
    if (totalSize !== fileSize) {
      return secureJsonResponse(
        { 
          success: false, 
          message: `Tamaño de archivo no coincide. Esperado: ${fileSize}, Recibido: ${totalSize}` 
        },
        { status: 400 }
      )
    }

    // Combinar todos los chunks
    console.log(`[Stream Upload] Combinando chunks (${totalSize} bytes)`)
    const completeBuffer = Buffer.concat(chunks)

    // Conectar al servidor SFTP con reintentos
    console.log(`[Stream Upload] Conectando a SFTP...`)
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
    console.log(`[Stream Upload] Subiendo ${uniqueName} a SFTP (${totalSize} bytes)`)
    await sftp.put(completeBuffer, remotePath)

    console.log(`[Stream Upload] Archivo subido exitosamente a ${remotePath}`)

    // Guardar metadata en Supabase
    const metadata_db: any = {
      filename: uniqueName,
      original_filename: sanitizedName,
      file_path: remotePath,
      file_size: fileSize,
      mime_type: mimeType,
      upload_batch_id: uploadBatchId || null,
    }

    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from("files")
      .insert(metadata_db)
      .select()
      .single()

    if (error) {
      console.error("[Stream Upload] Error guardando en Supabase:", error)
      // Archivo ya está en SFTP, pero metadata no se guardó
      // Retornar éxito parcial
      return secureJsonResponse({
        success: true,
        file: {
          id: uploadId,
          ...metadata_db,
          created_at: new Date().toISOString(),
        },
        warning: "Archivo subido pero metadata no guardada completamente",
      })
    }

    console.log(`[Stream Upload] Upload completado para ${fileName}`)

    return secureJsonResponse({
      success: true,
      file: data as FileMetadata,
    })
  } catch (error) {
    console.error("[Stream Upload] Error durante upload:", error)
    
    return secureJsonResponse(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al subir archivo",
      },
      { status: 500 }
    )
  } finally {
    // Cerrar conexión SFTP
    if (sftp) {
      try {
        await sftp.end()
      } catch (error) {
        console.error("[Stream Upload] Error cerrando conexión SFTP:", error)
      }
    }
  }
}
