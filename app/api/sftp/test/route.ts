import { type NextRequest, NextResponse } from "next/server"
import { testSFTPConnection } from "@/lib/sftp-client"
import type { SFTPConfig } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const config: SFTPConfig = await request.json()

    // Validar que todos los campos estén presentes
    if (!config.host || !config.username || !config.password) {
      return NextResponse.json({ success: false, message: "Faltan campos requeridos" }, { status: 400 })
    }

    // Probar la conexión
    const isConnected = await testSFTPConnection(config)

    if (isConnected) {
      return NextResponse.json({ success: true, message: "Conexión exitosa" })
    } else {
      return NextResponse.json({ success: false, message: "No se pudo conectar al servidor SFTP" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Error testing SFTP connection:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error al probar la conexión" },
      { status: 500 },
    )
  }
}
