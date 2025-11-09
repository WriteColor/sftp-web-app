import type { SFTPConfig } from "../types"

export function validateSFTPConfig(config: any): config is SFTPConfig {
  if (!config || typeof config !== "object") return false

  if (typeof config.host !== "string" || config.host.length === 0) return false
  if (typeof config.port !== "number" || config.port < 1 || config.port > 65535) return false
  if (typeof config.username !== "string" || config.username.length === 0) return false
  if (typeof config.password !== "string" || config.password.length === 0) return false

  return true
}

export function sanitizeFilename(filename: string): string {
  // Remover caracteres peligrosos y path traversal
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, "_")
    .substring(0, 255)
}

export function validateFileType(mimeType: string, allowedTypes?: string[]): boolean {
  if (!allowedTypes || allowedTypes.length === 0) return true

  return allowedTypes.some((type) => {
    if (type.endsWith("/*")) {
      const prefix = type.slice(0, -2)
      return mimeType.startsWith(prefix)
    }
    return mimeType === type
  })
}
