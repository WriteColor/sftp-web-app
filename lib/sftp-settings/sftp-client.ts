import Client from "ssh2-sftp-client"
import type { SFTPConfig } from "../types"

export async function createSFTPConnection(config: SFTPConfig): Promise<Client> {
  const sftp = new Client()

  try {
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      // Configuración mejorada para archivos grandes
      keepaliveInterval: 10000, // Mantener conexión viva cada 10 segundos
      keepaliveCountMax: 10, // Máximo 10 intentos de keepalive
      algorithms: {
        // Algoritmos más rápidos para mejor rendimiento
        compress: ['zlib@openssh.com', 'zlib', 'none'],
      } as any,
      // Debug desactivado para evitar spam en logs
      debug: undefined,
    } as any)
    return sftp
  } catch (error) {
    console.error("Error connecting to SFTP:", error)
    throw new Error("Failed to connect to SFTP server")
  }
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
