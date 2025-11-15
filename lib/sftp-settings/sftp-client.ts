import Client from "ssh2-sftp-client"
import type { SFTPConfig } from "../types"

export async function createSFTPConnection(config: SFTPConfig, retries = 3): Promise<Client> {
  const sftp = new Client()
  let lastError: any

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sftp.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        // Configuración mejorada para archivos grandes y estabilidad
        readyTimeout: 30000, // 30 segundos para establecer conexión
        keepaliveInterval: 10000, // Mantener conexión viva cada 10 segundos
        keepaliveCountMax: 10, // Máximo 10 intentos de keepalive
        algorithms: {
          // Algoritmos más rápidos para mejor rendimiento
          compress: ['zlib@openssh.com', 'zlib', 'none'],
        } as any,
        // Debug desactivado para evitar spam en logs
        debug: undefined,
      } as any)
      
      // Conexión exitosa
      if (attempt > 1) {
        console.log(`[WC] SFTP connection successful on attempt ${attempt}`)
      }
      return sftp
    } catch (error) {
      lastError = error
      console.error(`[WC] SFTP connection attempt ${attempt}/${retries} failed:`, error)
      
      if (attempt < retries) {
        // Esperar antes de reintentar (backoff exponencial)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error("[WC] All SFTP connection attempts failed:", lastError)
  throw new Error("Failed to connect to SFTP server after multiple attempts")
}

export async function testSFTPConnection(config: SFTPConfig): Promise<boolean> {
  const sftp = new Client()

  try {
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      keepaliveInterval: 5000,
    } as any)
    await sftp.end()
    return true
  } catch (error) {
    console.error("SFTP connection test failed:", error)
    return false
  }
}
