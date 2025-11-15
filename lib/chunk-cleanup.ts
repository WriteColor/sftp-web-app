import { readdir, stat, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

const TEMP_DIR = join(tmpdir(), "sftp-chunks")
const MAX_AGE_MS = 3600000 // 1 hora

// Función para limpiar chunks antiguos
export async function cleanupOldChunks(): Promise<void> {
  try {
    const files = await readdir(TEMP_DIR).catch(() => [])
    const now = Date.now()

    for (const file of files) {
      const filePath = join(TEMP_DIR, file)
      
      try {
        const stats = await stat(filePath)
        const age = now - stats.mtimeMs

        // Eliminar archivos más antiguos de 1 hora
        if (age > MAX_AGE_MS) {
          await unlink(filePath)
          console.log(`[WC] Cleaned up old chunk: ${file}`)
        }
      } catch (error) {
        // Ignorar errores individuales
      }
    }
  } catch (error) {
    console.error("[WC] Error cleaning up old chunks:", error)
  }
}

// Ejecutar limpieza periódicamente si estamos en el servidor
if (typeof window === "undefined") {
  setInterval(() => {
    cleanupOldChunks()
  }, 1800000) // Cada 30 minutos
}
