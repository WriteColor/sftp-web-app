import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createSFTPConnection } from "@/lib/sftp-settings/sftp-client"
import type { SFTPConfig } from "@/lib/types"
import { rateLimit } from "@/lib/sftp-settings/rate-limit"

// Obtener configuración SFTP desde variables de entorno
async function getSFTPConfig(): Promise<SFTPConfig | null> {
  const config: SFTPConfig = {
    host: process.env.SFTP_HOST || "",
    port: Number.parseInt(process.env.SFTP_PORT || "22"),
    username: process.env.SFTP_USERNAME || "",
    password: process.env.SFTP_PASSWORD || "",
  }

  if (!config.host || !config.username || !config.password) {
    return null
  }

  return config
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let sftp: any = null

  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    if (!rateLimit(`serve:${ip}`, 30, 60000)) {
      return NextResponse.json({ success: false, message: "Demasiadas solicitudes" }, { status: 429 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const download = searchParams.get("download") === "true"

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ success: false, message: "ID inválido" }, { status: 400 })
    }

    const supabase = await createClient()

    // Obtener información del archivo
    const { data: file, error: fetchError } = await supabase.from("sftp_files").select("*").eq("id", id).single()

    if (fetchError || !file) {
      return NextResponse.json({ success: false, message: "Archivo no encontrado" }, { status: 404 })
    }

    // Obtener configuración SFTP
    const config = await getSFTPConfig()

    if (!config) {
      return NextResponse.json({ success: false, message: "Configuración SFTP no disponible" }, { status: 500 })
    }

    // Conectar al servidor SFTP y obtener el archivo
    sftp = await createSFTPConnection(config)
    const buffer = await sftp.get(file.file_path)
    await sftp.end()

    // Preparar headers con seguridad
    const headers = new Headers()
    headers.set("Content-Type", file.mime_type)
    headers.set("Cache-Control", "public, max-age=31536000, immutable")
    headers.set("X-Content-Type-Options", "nosniff")

    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${file.original_filename}"`)
    } else {
      headers.set("Content-Disposition", `inline; filename="${file.original_filename}"`)
    }

    return new NextResponse(buffer, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("[WC] Error serving file:", error)

    if (sftp) {
      try {
        await sftp.end()
      } catch (e) {
        // Ignorar errores al cerrar
      }
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error al servir archivo" },
      { status: 500 },
    )
  }
}
