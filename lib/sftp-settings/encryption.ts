import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto"
import { promisify } from "util"

const scryptAsync = promisify(scrypt)
const ALGORITHM = "aes-256-gcm"

// Encriptar configuración SFTP para almacenamiento seguro
export async function encryptConfig(config: string, password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = (await scryptAsync(password, salt, 32)) as Buffer
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(config, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  // Combinar salt, iv, authTag y datos encriptados
  return `${salt.toString("hex")}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

// Desencriptar configuración SFTP
export async function decryptConfig(encryptedData: string, password: string): Promise<string> {
  const [saltHex, ivHex, authTagHex, encrypted] = encryptedData.split(":")

  const salt = Buffer.from(saltHex, "hex")
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const key = (await scryptAsync(password, salt, 32)) as Buffer

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
