import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { secureJsonResponse, isValidUUID } from "@/lib/security"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { searchParams } = new URL(request.url)
    const uploadBatchId = searchParams.get("uploadBatchId")

    // Validar UUID si se proporciona
    if (uploadBatchId && !isValidUUID(uploadBatchId)) {
      return secureJsonResponse(
        { success: false, message: "ID de lote inválido" },
        { status: 400 }
      )
    }

    let query = supabase.from("sftp_files").select("*").order("uploaded_at", { ascending: false })

    if (uploadBatchId) {
      query = query.eq("upload_batch_id", uploadBatchId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[WC] Error fetching files:", error)
      return secureJsonResponse(
        { success: false, message: "Error al obtener archivos" },
        { status: 500 }
      )
    }

    // Filtrar archivos que tengan ID válido y file_path
    const validFiles = (data || []).filter(file => 
      file.id && 
      file.file_path && 
      file.filename && 
      file.file_size > 0
    )

    console.log(`[WC] Returning ${validFiles.length} valid files (filtered from ${data?.length || 0})`)

    return secureJsonResponse({ success: true, files: validFiles })
  } catch (error) {
    console.error("[WC] Error in files route:", error)
    return secureJsonResponse(
      { success: false, message: "Error al obtener archivos" },
      { status: 500 }
    )
  }
}
