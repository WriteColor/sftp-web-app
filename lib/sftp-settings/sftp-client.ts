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
    })
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
    })
    await sftp.end()
    return true
  } catch (error) {
    console.error("SFTP connection test failed:", error)
    return false
  }
}
