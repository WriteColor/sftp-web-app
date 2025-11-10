import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { secureJsonResponse, validateContentType, sanitizeString } from "@/lib/security"

export async function GET() {
  try {
    const supabase = await createServerClient()

    const { data: batches, error } = await supabase
      .from("upload_batches")
      .select(`
        *,
        file_count:sftp_files(count)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      return secureJsonResponse(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    // Formatear el conteo de archivos
    const formattedBatches = batches?.map((batch) => ({
      ...batch,
      file_count: batch.file_count?.[0]?.count || 0,
    }))

    return secureJsonResponse({ success: true, batches: formattedBatches })
  } catch (error: any) {
    return secureJsonResponse(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validar Content-Type
    if (!validateContentType(request)) {
      return secureJsonResponse(
        { success: false, message: "Content-Type inválido" },
        { status: 400 }
      )
    }

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return secureJsonResponse(
        { success: false, message: "El nombre es requerido" },
        { status: 400 }
      )
    }

    // Sanitizar el nombre para prevenir XSS
    const sanitizedName = sanitizeString(name.trim())

    const supabase = await createServerClient()

    const { data: batch, error } = await supabase
      .from("upload_batches")
      .insert({ name: sanitizedName })
      .select()
      .single()

    if (error) {
      return secureJsonResponse(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return secureJsonResponse({ success: true, batch })
  } catch (error: any) {
    return secureJsonResponse(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
