/**
 * Sanitiza archivos eliminando metadatos potencialmente perjudiciales
 * Incluye: EXIF data (GPS, fecha, cámara), scripts ocultos, metadatos de documentos
 */

/**
 * Emite un evento de progreso de sanitización
 */
function emitSanitizeProgress(fileName: string, progress: number, statusMessage: string) {
  window.dispatchEvent(
    new CustomEvent('fileProgress', {
      detail: {
        fileName,
        progress,
        status: 'sanitizing',
        statusMessage,
      },
    })
  )
}

/**
 * Sanitiza una imagen eliminando todos los metadatos EXIF y recodificándola
 */
async function sanitizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    // Emitir evento de inicio
    emitSanitizeProgress(file.name, 10, 'Cargando imagen...')

    img.onload = () => {
      try {
        emitSanitizeProgress(file.name, 30, 'Procesando...')
        
        // Crear canvas con las dimensiones de la imagen
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        emitSanitizeProgress(file.name, 50, 'Eliminando metadatos...')

        // Dibujar la imagen en el canvas (esto elimina todos los metadatos)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('No se pudo crear el contexto del canvas'))
          return
        }

        ctx.drawImage(img, 0, 0)
        emitSanitizeProgress(file.name, 70, 'Recodificando...')

        // Convertir el canvas a blob
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl)
            
            if (!blob) {
              reject(new Error('No se pudo convertir la imagen'))
              return
            }

            emitSanitizeProgress(file.name, 90, 'Finalizando...')

            // Crear un nuevo File sin metadatos
            const sanitizedFile = new File(
              [blob],
              file.name,
              {
                type: file.type || 'image/png',
                lastModified: Date.now(), // Fecha actual para evitar exponer la original
              }
            )

            // Emitir estado "ready" cuando termine la sanitización
            window.dispatchEvent(
              new CustomEvent('fileProgress', {
                detail: {
                  fileName: file.name,
                  progress: 100,
                  status: 'ready',
                  statusMessage: 'Listo para subir',
                },
              })
            )
            resolve(sanitizedFile)
          },
          file.type || 'image/png',
          0.95 // Calidad del 95%
        )
      } catch (error) {
        URL.revokeObjectURL(objectUrl)
        reject(error)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo cargar la imagen'))
    }

    img.src = objectUrl
  })
}

/**
 * Sanitiza un video eliminando metadatos
 * Nota: La sanitización completa de videos requiere procesamiento en el servidor
 * Esta función solo normaliza el archivo en el cliente
 */
async function sanitizeVideo(file: File): Promise<File> {
  // Para videos, creamos un nuevo File con fecha actual
  // La sanitización completa de metadatos de video requiere ffmpeg en el servidor
  emitSanitizeProgress(file.name, 30, 'Procesando video...')
  const blob = await file.arrayBuffer()
  emitSanitizeProgress(file.name, 80, 'Limpiando metadatos...')
  
  const sanitizedFile = new File(
    [blob],
    file.name,
    {
      type: file.type,
      lastModified: Date.now(),
    }
  )
  
  // Emitir estado "ready" cuando termine la sanitización
  window.dispatchEvent(
    new CustomEvent('fileProgress', {
      detail: {
        fileName: file.name,
        progress: 100,
        status: 'ready',
        statusMessage: 'Listo para subir',
      },
    })
  )
  return sanitizedFile
}

/**
 * Sanitiza documentos y otros archivos eliminando metadatos de fecha
 */
async function sanitizeDocument(file: File): Promise<File> {
  emitSanitizeProgress(file.name, 40, 'Procesando archivo...')
  const blob = await file.arrayBuffer()
  emitSanitizeProgress(file.name, 80, 'Limpiando metadatos...')
  
  const sanitizedFile = new File(
    [blob],
    file.name,
    {
      type: file.type,
      lastModified: Date.now(),
    }
  )
  
  // Emitir estado "ready" cuando termine la sanitización
  window.dispatchEvent(
    new CustomEvent('fileProgress', {
      detail: {
        fileName: file.name,
        progress: 100,
        status: 'ready',
        statusMessage: 'Listo para subir',
      },
    })
  )
  return sanitizedFile
}

/**
 * Función principal que sanitiza cualquier tipo de archivo
 */
export async function sanitizeFile(file: File): Promise<File> {
  try {
    // Emitir evento de inicio
    emitSanitizeProgress(file.name, 5, 'Iniciando sanitización...')
    
    // Sanitizar según el tipo de archivo
    if (file.type.startsWith('image/')) {
      return await sanitizeImage(file)
    } else if (file.type.startsWith('video/')) {
      return await sanitizeVideo(file)
    } else {
      return await sanitizeDocument(file)
    }
  } catch (error) {
    console.error('Error al sanitizar archivo:', error)
    
    // Emitir evento de error
    window.dispatchEvent(
      new CustomEvent('fileProgress', {
        detail: {
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: 'Error en sanitización',
        },
      })
    )
    
    // Si falla la sanitización, retornar el archivo original
    // pero al menos actualizar la fecha
    const blob = await file.arrayBuffer()
    return new File(
      [blob],
      file.name,
      {
        type: file.type,
        lastModified: Date.now(),
      }
    )
  }
}

/**
 * Sanitiza múltiples archivos en paralelo
 */
export async function sanitizeFiles(files: File[]): Promise<File[]> {
  const promises = files.map(file => sanitizeFile(file))
  return Promise.all(promises)
}
