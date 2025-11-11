'use server'

import { createSFTPConnection } from '@/lib/sftp-settings/sftp-client'
import { validateSFTPConfig, sanitizeFilename } from '@/lib/sftp-settings/validation'
import { getServerSFTPConfig } from '@/lib/sftp-settings/sftp-config'
import { createServerClient } from '@/lib/supabase/server'
import type { SFTPConfig } from '@/lib/types'
import { randomBytes } from 'crypto'
import path from 'path'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const MAX_FILES = 20

export async function uploadFilesAction(formData: FormData) {
  let sftp: any = null
  
  try {
    const files = formData.getAll('files') as File[]
    const configStr = formData.get('config') as string
    
    if (!configStr) {
      return { success: false, error: 'Configuración no proporcionada' }
    }

    // Parsear y completar configuración con variables de entorno del servidor
    let config: SFTPConfig
    try {
      const partialConfig: Partial<SFTPConfig> = JSON.parse(configStr)
      // Completar la configuración con las variables de entorno del servidor
      config = getServerSFTPConfig(partialConfig)
    } catch (error) {
      return { success: false, error: 'Configuración inválida' }
    }

    // Validar configuración final
    if (!validateSFTPConfig(config)) {
      return { success: false, error: 'Configuración SFTP inválida' }
    }

    // Validar archivos
    if (!files || files.length === 0) {
      return { success: false, error: 'No se proporcionaron archivos' }
    }

    if (files.length > MAX_FILES) {
      return { success: false, error: `Máximo ${MAX_FILES} archivos permitidos` }
    }

    // Validar tamaños
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return { 
          success: false, 
          error: `El archivo "${file.name}" excede el límite de 500MB` 
        }
      }
      if (file.size === 0) {
        return { 
          success: false, 
          error: `El archivo "${file.name}" está vacío` 
        }
      }
    }

    // Conectar a SFTP
    try {
      sftp = await createSFTPConnection(config)
    } catch (error) {
      console.error('Error al conectar a SFTP:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al conectar al servidor SFTP' 
      }
    }

    try {
      const uploadDir = "/uploads/sftp-web-app"
      const uploadBatchId = formData.get('uploadBatchId') as string | null
      const supabase = await createServerClient()

      // Crear directorio de uploads si no existe
      try {
        await sftp.mkdir(uploadDir, true)
      } catch (error) {
        // El directorio ya existe, continuar
      }

      const uploadedFiles = []
      const errors: string[] = []

      // Subir cada archivo
      for (const file of files) {
        try {
          const sanitizedName = sanitizeFilename(file.name)
          
          // Generar nombre único para el archivo
          const fileExt = path.extname(sanitizedName)
          const uniqueName = `${randomBytes(16).toString('hex')}${fileExt}`
          const remotePath = `${uploadDir}/${uniqueName}`

          // Convertir File a Buffer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Subir archivo al servidor SFTP
          await sftp.put(buffer, remotePath)

          // Preparar metadata para guardar en DB
          const metadata: any = {
            filename: uniqueName,
            original_filename: sanitizedName,
            file_path: remotePath,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
          }

          if (uploadBatchId) {
            metadata.upload_batch_id = uploadBatchId
          }

          // Guardar metadata en Supabase
          const { data, error } = await supabase
            .from('sftp_files')
            .insert(metadata)
            .select()
            .single()

          if (error) {
            console.error('Error al guardar metadata del archivo:', error)
            errors.push(`${file.name}: Error al guardar metadata`)
          } else {
            uploadedFiles.push(data)
          }
        } catch (error) {
          console.error(`Error al subir ${file.name}:`, error)
          errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }
      }

      // Cerrar conexión SFTP
      await sftp.end()

      // Verificar resultados
      if (uploadedFiles.length === 0) {
        return {
          success: false,
          error: 'No se pudo subir ningún archivo',
          details: errors
        }
      }

      const allSuccessful = errors.length === 0
      
      return {
        success: allSuccessful,
        message: allSuccessful 
          ? `${uploadedFiles.length} archivo(s) subido(s) exitosamente`
          : `${uploadedFiles.length} exitosos, ${errors.length} fallidos`,
        files: uploadedFiles,
        errors: errors.length > 0 ? errors : undefined
      }

    } catch (error) {
      if (sftp) await sftp.end()
      console.error('Error durante la subida:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error durante la subida de archivos' 
      }
    }

  } catch (error) {
    if (sftp) await sftp.end()
    console.error('Error en uploadFilesAction:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al procesar la solicitud' 
    }
  }
}

// Nota: maxDuration y dynamic se configuran en next.config.mjs
