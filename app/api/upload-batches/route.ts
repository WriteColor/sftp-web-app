import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

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
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    // Formatear el conteo de archivos
    const formattedBatches = batches?.map((batch) => ({
      ...batch,
      file_count: batch.file_count?.[0]?.count || 0,
    }))

    return NextResponse.json({ success: true, batches: formattedBatches })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "El nombre es requerido" }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { data: batch, error } = await supabase.from("upload_batches").insert({ name: name.trim() }).select().single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, batch })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
