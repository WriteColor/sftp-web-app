import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("sftp_files").select("*").order("uploaded_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching files:", error)
      return NextResponse.json({ success: false, message: "Error al obtener archivos" }, { status: 500 })
    }

    return NextResponse.json({ success: true, files: data })
  } catch (error) {
    console.error("[v0] Error in files route:", error)
    return NextResponse.json({ success: false, message: "Error al obtener archivos" }, { status: 500 })
  }
}
