import type { SFTPConfig } from "../types"

/**
 * Obtiene la configuración SFTP completa usando las variables de entorno del servidor
 * Si se proporciona una configuración parcial, la completa con los valores del servidor
 */
export function getServerSFTPConfig(partialConfig?: Partial<SFTPConfig>): SFTPConfig {
  const serverConfig: SFTPConfig = {
    host: process.env.SFTP_HOST || "",
    port: parseInt(process.env.SFTP_PORT || "22"),
    username: process.env.SFTP_USERNAME || "",
    password: process.env.SFTP_PASSWORD || "",
  }

  // Si no se proporciona configuración parcial, retornar la configuración del servidor
  if (!partialConfig) {
    return serverConfig
  }

  // Combinar la configuración parcial con la del servidor
  // La configuración del servidor tiene prioridad para la contraseña si no se proporciona
  return {
    host: partialConfig.host || serverConfig.host,
    port: partialConfig.port || serverConfig.port,
    username: partialConfig.username || serverConfig.username,
    password: partialConfig.password || serverConfig.password,
  }
}

/**
 * Valida que la configuración SFTP esté completa
 */
export function isValidSFTPConfig(config: SFTPConfig): boolean {
  return !!(config.host && config.username && config.password && config.port)
}
