import { type NextRequest, NextResponse } from "next/server"
import { createSFTPConnection } from "@/lib/sftp-client"
import { createClient } from "@/lib/supabase/server"
import type { SFTPConfig, FileMetadata } from "@/lib/types"
import { randomBytes } from "crypto"
import path from "path"
import { validateSFTPConfig, sanitizeFilename } from "@/lib/validation"
import { rateLimit } from "@/lib/rate-limit"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_FILES = 20

export async function POST(request: NextRequest) {
  let sftp: any = null

  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    if (!rateLimit(ip, 10, 60000)) {
      return NextResponse.json(
        { success: false, message: "Demasiadas solicitudes. Intenta más tarde." },
        { status: 429 },
      )
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const configStr = formData.get("config") as string

    if (!configStr) {
      return NextResponse.json({ success: false, message: "Configuración SFTP no proporcionada" }, { status: 400 })
    }

    const config: SFTPConfig = JSON.parse(configStr)

    if (!validateSFTPConfig(config)) {
      return NextResponse.json({ success: false, message: "Configuración SFTP inválida" }, { status: 400 })
    }

    // Validar cantidad de archivos
    if (files.length === 0) {
      return NextResponse.json({ success: false, message: "No se proporcionaron archivos" }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ success: false, message: `Máximo ${MAX_FILES} archivos permitidos` }, { status: 400 })
    }

    // Validar tamaño de archivos
    const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE)
    if (oversizedFiles.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Algunos archivos exceden el tamaño máximo",
          errors: oversizedFiles.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`),
        },
        { status: 400 },
      )
    }

    // Conectar al servidor SFTP
    sftp = await createSFTPConnection(config)

    // Crear directorio de uploads si no existe
    const uploadDir = "/uploads"
    try {
      await sftp.mkdir(uploadDir, true)
    } catch (error) {
      // El directorio ya existe, continuar
    }

    // Subir archivos y guardar metadata
    const uploadedFiles: FileMetadata[] = []
    const errors: string[] = []
    const supabase = await createClient()

    for (const file of files) {
      try {
        const sanitizedName = sanitizeFilename(file.name)

        // Generar nombre único para el archivo
        const fileExt = path.extname(sanitizedName)
        const uniqueName = `${randomBytes(16).toString("hex")}${fileExt}`
        const remotePath = `${uploadDir}/${uniqueName}`

        // Convertir File a Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Subir archivo al servidor SFTP
        await sftp.put(buffer, remotePath)

        // Guardar metadata en la base de datos
        const metadata: FileMetadata = {
          filename: uniqueName,
          original_filename: sanitizedName,
          file_path: remotePath,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
        }

        const { data, error } = await supabase.from("sftp_files").insert(metadata).select().single()

        if (error) {
          console.error("[v0] Error saving file metadata:", error)
          errors.push(`${file.name}: Error al guardar metadata`)
        } else {
          uploadedFiles.push(data)
        }
      } catch (error) {
        console.error(`[v0] Error uploading file ${file.name}:`, error)
        errors.push(`${file.name}: ${error instanceof Error ? error.message : "Error desconocido"}`)
      }
    }

    // Cerrar conexión SFTP
    await sftp.end()

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No se pudo subir ningún archivo",
          errors,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} archivo(s) subido(s) exitosamente`,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("[v0] Error in upload route:", error)

    if (sftp) {
      try {
        await sftp.end()
      } catch (e) {
        // Ignorar errores al cerrar
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al subir archivos",
      },
      { status: 500 },
    )
  }
}
