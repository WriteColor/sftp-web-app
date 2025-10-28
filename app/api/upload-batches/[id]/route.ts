import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: batch, error } = await supabase.from("upload_batches").select("*").eq("id", id).single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    if (!batch) {
      return NextResponse.json({ success: false, message: "Registro no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, batch })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
