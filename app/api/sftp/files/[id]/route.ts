import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createSFTPConnection } from "@/lib/sftp-settings/sftp-client"
import type { SFTPConfig } from "@/lib/types"
import { getServerSFTPConfig } from "@/lib/sftp-settings/sftp-config"
import { secureJsonResponse, validateContentType, isValidUUID } from "@/lib/security"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let sftp: any = null

  try {
    const { id } = await params

    // Validar UUID
    if (!isValidUUID(id)) {
      return secureJsonResponse(
        { success: false, message: "ID inválido" },
        { status: 400 }
      )
    }

    // Validar Content-Type
    if (!validateContentType(request)) {
      return secureJsonResponse(
        { success: false, message: "Content-Type inválido" },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // Usar la configuración del servidor, o combinarla con la del cliente
    const config: SFTPConfig = body.config 
      ? getServerSFTPConfig(body.config)
      : getServerSFTPConfig()

    const supabase = await createClient()

    // Obtener información del archivo
    const { data: file, error: fetchError } = await supabase.from("sftp_files").select("*").eq("id", id).single()

    if (fetchError || !file) {
      return secureJsonResponse(
        { success: false, message: "Archivo no encontrado" },
        { status: 404 }
      )
    }

    // Conectar al servidor SFTP y eliminar el archivo
    sftp = await createSFTPConnection(config)
    await sftp.delete(file.file_path)
    await sftp.end()

    // Eliminar registro de la base de datos
    const { error: deleteError } = await supabase.from("sftp_files").delete().eq("id", id)

    if (deleteError) {
      console.error("[WC] Error deleting file record:", deleteError)
      return secureJsonResponse(
        { success: false, message: "Error al eliminar registro" },
        { status: 500 }
      )
    }

    return secureJsonResponse({ success: true, message: "Archivo eliminado exitosamente" })
  } catch (error) {
    console.error("[WC] Error deleting file:", error)

    if (sftp) {
      try {
        await sftp.end()
      } catch (e) {
        // Ignorar errores al cerrar
      }
    }

    return secureJsonResponse(
      { success: false, message: error instanceof Error ? error.message : "Error al eliminar archivo" },
      { status: 500 },
    )
  }
}
