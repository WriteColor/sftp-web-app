import { type NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { rateLimit } from "@/lib/sftp-settings/rate-limit"
import { secureJsonResponse } from "@/lib/security"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { cleanupOldChunks } from "@/lib/chunk-cleanup"

const MAX_CHUNK_SIZE = 4.5 * 1024 * 1024 // 4.5MB por chunk (límite de Vercel/Next.js)
const TEMP_DIR = join(tmpdir(), "sftp-chunks")

// Timeout corto para cada chunk - debe completarse rápido
export const maxDuration = 30 // 30 segundos por chunk
export const dynamic = 'force-dynamic'

// Configuración para permitir body grande
export const runtime = 'nodejs'

// IMPORTANTE: En Next.js 15+, el límite de body está en serverActions.bodySizeLimit (next.config.mjs)
// Vercel tiene un límite de 4.5MB para requests, por eso usamos chunks de 4MB

interface ChunkMetadata {
  uploadId: string
  chunkIndex: number
  totalChunks: number
  fileName: string
  fileSize: number
  mimeType: string
}

export async function POST(request: NextRequest) {
  try {
    // Limpiar chunks antiguos periódicamente
    cleanupOldChunks().catch(console.error)

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    // Rate limit generoso para chunks: 150 chunks por minuto (suficiente para archivos de 500MB)
    // Un archivo de 500MB = 125 chunks, por eso 150 es seguro
    if (!rateLimit(ip, 150, 60000)) {
      return secureJsonResponse(
        { success: false, message: "Demasiadas solicitudes. Intenta más tarde." },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const chunk = formData.get("chunk") as File
    const metadataStr = formData.get("metadata") as string

    if (!chunk || !metadataStr) {
      return secureJsonResponse(
        { success: false, message: "Chunk o metadata faltante" },
        { status: 400 }
      )
    }

    const metadata: ChunkMetadata = JSON.parse(metadataStr)

    // Validar tamaño del chunk
    if (chunk.size > MAX_CHUNK_SIZE) {
      return secureJsonResponse(
        { success: false, message: `Chunk demasiado grande. Máximo ${MAX_CHUNK_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Crear directorio temporal si no existe
    await mkdir(TEMP_DIR, { recursive: true })

    // Guardar chunk en sistema de archivos temporal
    const chunkPath = join(TEMP_DIR, `${metadata.uploadId}_chunk_${metadata.chunkIndex}`)
    const arrayBuffer = await chunk.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    await writeFile(chunkPath, buffer)

    return secureJsonResponse({
      success: true,
      message: `Chunk ${metadata.chunkIndex + 1}/${metadata.totalChunks} recibido`,
      chunkIndex: metadata.chunkIndex,
    })
  } catch (error) {
    console.error("[WC] Error in upload-chunk route:", error)
    return secureJsonResponse(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al subir chunk",
      },
      { status: 500 }
    )
  }
}
