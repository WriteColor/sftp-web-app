import { type NextRequest, NextResponse } from "next/server"
import { testSFTPConnection } from "@/lib/sftp-settings/sftp-client"
import type { SFTPConfig } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    // Usar las credenciales de las variables de entorno
    const config: SFTPConfig = {
      host: process.env.SFTP_HOST || "",
      port: parseInt(process.env.SFTP_PORT || "22"),
      username: process.env.SFTP_USERNAME || "",
      password: process.env.SFTP_PASSWORD || "",
    }

    // Validar que las variables de entorno estén configuradas
    if (!config.host || !config.username || !config.password) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Configuración SFTP incompleta. Verifica las variables de entorno." 
        }, 
        { status: 500 }
      )
    }

    // Probar la conexión
    const isConnected = await testSFTPConnection(config)

    if (isConnected) {
      return NextResponse.json({ 
        success: true, 
        message: "Conexión SFTP exitosa",
        config: {
          host: config.host,
          port: config.port,
          username: config.username,
          // No devolver la contraseña por seguridad
        }
      })
    } else {
      return NextResponse.json(
        { success: false, message: "No se pudo conectar al servidor SFTP" }, 
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("[SFTP Connect] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Error al conectar con el servidor SFTP" 
      },
      { status: 500 },
    )
  }
}
//