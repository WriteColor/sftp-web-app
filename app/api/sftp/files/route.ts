import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { searchParams } = new URL(request.url)
    const uploadBatchId = searchParams.get("uploadBatchId")

    let query = supabase.from("sftp_files").select("*").order("uploaded_at", { ascending: false })

    if (uploadBatchId) {
      query = query.eq("upload_batch_id", uploadBatchId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[WC] Error fetching files:", error)
      return NextResponse.json({ success: false, message: "Error al obtener archivos" }, { status: 500 })
    }

    return NextResponse.json({ success: true, files: data })
  } catch (error) {
    console.error("[WC] Error in files route:", error)
    return NextResponse.json({ success: false, message: "Error al obtener archivos" }, { status: 500 })
  }
}
