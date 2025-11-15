# Sistema de Chunked Upload con Supabase Storage

## Problema en Vercel

Vercel usa funciones serverless que son **stateless** y pueden ejecutarse en diferentes contenedores/regiones. Esto causa problemas cuando:

1. Los chunks se guardan en `/tmp` (filesystem temporal)
2. Cada chunk puede ir a un servidor diferente
3. Al finalizar, los chunks pueden no estar disponibles

## Solución: Supabase Storage como Buffer Temporal

### Arquitectura

```
Cliente                    Vercel Serverless              Supabase Storage         SFTP Server
   |                              |                              |                      |
   |-- Chunk 1 ------------------>|                              |                      |
   |                              |-- Guardar Chunk 1 --------->|                      |
   |                              |<- OK ------------------------|                      |
   |<- Progreso 4% ---------------|                              |                      |
   |                              |                              |                      |
   |-- Chunk 2 ------------------>|                              |                      |
   |                              |-- Guardar Chunk 2 --------->|                      |
   |                              |<- OK ------------------------|                      |
   |<- Progreso 8% ---------------|                              |                      |
   |                              |                              |                      |
   |    ... (todos los chunks)    |                              |                      |
   |                              |                              |                      |
   |-- Complete Request --------->|                              |                      |
   |                              |-- Descargar todos chunks --->|                      |
   |                              |<- Chunks 1-25 ---------------|                      |
   |                              |-- Ensamblar en memoria       |                      |
   |                              |-- Subir archivo completo -------------------->     |
   |                              |                              |                      |
   |                              |-- Eliminar chunks temporales->|                      |
   |<- Success 100% --------------|                              |                      |
```

### Flujo Detallado

#### 1. Upload de Chunks (POST /api/sftp/upload-chunk)

```typescript
// Cliente divide archivo
const totalChunks = Math.ceil(file.size / CHUNK_SIZE) // CHUNK_SIZE = 4MB

// Por cada chunk
for (let i = 0; i < totalChunks; i++) {
  const chunk = file.slice(start, end)
  
  // Enviar a API
  POST /api/sftp/upload-chunk
  Body: FormData {
    chunk: Blob (max 4MB),
    metadata: {
      uploadId: UUID,
      chunkIndex: number,
      totalChunks: number,
      fileName, fileSize, mimeType
    }
  }
  
  // Servidor guarda en Supabase Storage
  supabase.storage
    .from('chunks-temp')
    .upload(`${uploadId}_chunk_${i}`, chunk)
}
```

**Ventajas:**
- ✅ Cada chunk < 4.5MB (límite de Vercel)
- ✅ Almacenamiento confiable y persistente
- ✅ Funciona en cualquier región de Vercel
- ✅ Rate limit: 150 chunks/min (permite 500MB)

#### 2. Finalización (POST /api/sftp/complete-upload)

```typescript
// Cliente envía señal de completar
POST /api/sftp/complete-upload
Body: JSON {
  uploadId,
  fileName, fileSize, mimeType,
  totalChunks,
  config, uploadBatchId
}

// Servidor procesa
for (let i = 0; i < totalChunks; i++) {
  // Descargar chunk desde Supabase
  const { data } = await supabase.storage
    .from('chunks-temp')
    .download(`${uploadId}_chunk_${i}`)
  
  chunks.push(Buffer.from(await data.arrayBuffer()))
}

// Ensamblar en memoria
const completeFile = Buffer.concat(chunks)

// Subir a SFTP
await sftp.put(completeFile, remotePath)

// Limpiar chunks temporales
await supabase.storage
  .from('chunks-temp')
  .remove(chunkFileNames)
```

**Ventajas:**
- ✅ Todos los chunks disponibles sin importar región
- ✅ Ensamblado garantizado
- ✅ Limpieza automática
- ✅ Timeout de 60s (suficiente para ensamblar 500MB)

## Configuración Requerida

### 1. Bucket de Supabase

Crear bucket `chunks-temp` en Supabase Storage:

```sql
-- Ver scripts/003_create_chunks_temp_bucket.sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chunks-temp', 'chunks-temp', false, 4718592); -- 4.5MB

-- Políticas de acceso
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chunks-temp');

CREATE POLICY "Allow authenticated downloads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chunks-temp');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chunks-temp');
```

### 2. Variables de Entorno

Asegúrate de tener configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

## Límites Actuales

| Límite | Valor | Razón |
|--------|-------|-------|
| **Chunk size** | 4MB | Vercel body limit: 4.5MB (con margen) |
| **Max file size** | 500MB | Timeout de 60s para ensamblar |
| **Rate limit chunks** | 150/min | 500MB = 125 chunks, 150 da margen |
| **Rate limit complete** | 30/min | Múltiples archivos simultáneos |
| **Timeout chunk** | 30s | Upload individual a Supabase |
| **Timeout complete** | 60s | Descargar, ensamblar y subir a SFTP |

## Costos de Supabase

El plan gratuito de Supabase incluye:
- **Storage:** 1GB gratis
- **Bandwidth:** 2GB/mes gratis

Para archivos grandes:

| Archivo | Chunks | Storage Temporal | Bandwidth (Upload + Download) |
|---------|--------|------------------|-------------------------------|
| 100MB | 25 | 100MB | 200MB (100 up + 100 down) |
| 500MB | 125 | 500MB | 1GB (500 up + 500 down) |

**Recomendación:** Los chunks se limpian inmediatamente después de completar, así que el storage temporal es efímero (solo durante la subida).

## Comparación con Soluciones Alternativas

### Opción 1: /tmp Filesystem (❌ No funciona en Vercel)
- ❌ No persiste entre funciones serverless
- ❌ Cada región tiene su propio /tmp
- ❌ Chunks se pierden al finalizar

### Opción 2: Vercel Blob Storage (💰 Requiere pago)
- ✅ Diseñado para Vercel
- ✅ Edge network rápido
- ❌ No incluido en plan gratuito
- ❌ Costos adicionales por GB

### Opción 3: Supabase Storage (✅ Implementado)
- ✅ Incluido en plan gratuito
- ✅ Ya tenemos Supabase configurado
- ✅ Confiable y persistente
- ✅ Políticas de acceso configurables
- ⚠️ Consume bandwidth del plan

### Opción 4: Streaming Directo (❌ Limitado por Vercel)
- ❌ Body limit de 4.5MB bloquea archivos grandes
- ❌ Requeriría enviar todo el archivo < 4.5MB
- ✅ Más simple (sin chunks)

## Monitoreo y Debug

### Logs en Producción

En Vercel:
```
[Upload Chunk] Chunk 1/25 guardado en Supabase
[Upload Chunk] Chunk 2/25 guardado en Supabase
...
[Complete Upload] Descargando 25 chunks desde Supabase...
[Complete Upload] Combinando chunks (97702400 bytes)
[Complete Upload] Conectando a SFTP...
[Complete Upload] Subiendo xxx.mp4 a SFTP (97702400 bytes)
[Complete Upload] Archivo subido exitosamente a /uploads/sftp-web-app/xxx.mp4
[Complete Upload] Limpiados 25 chunks temporales
```

### Errores Comunes

**"Chunk X faltante o corrupto"**
- Causa: Chunk no se subió correctamente a Supabase
- Solución: Verificar rate limits, reintentar upload

**"Tamaño de archivo no coincide"**
- Causa: Algunos chunks están incompletos o corruptos
- Solución: Verificar integridad de chunks en Supabase

**"Error al guardar chunk temporalmente"**
- Causa: Problemas de permisos en bucket o límite de storage
- Solución: Verificar políticas de Supabase, verificar espacio disponible

## Mejoras Futuras

### 1. Retry Automático de Chunks
```typescript
// Si falla un chunk, reintentarlo automáticamente
for (let retry = 0; retry < 3; retry++) {
  try {
    await uploadChunk(chunk)
    break
  } catch (error) {
    if (retry === 2) throw error
    await sleep(1000 * Math.pow(2, retry))
  }
}
```

### 2. Limpieza Programada
```typescript
// Cron job para limpiar chunks >1 hora
// Vercel Cron o Supabase Edge Function
export async function cleanupOldChunks() {
  const oneHourAgo = new Date(Date.now() - 3600000)
  const { data } = await supabase.storage
    .from('chunks-temp')
    .list()
  
  const oldChunks = data.filter(f => 
    new Date(f.created_at) < oneHourAgo
  )
  
  await supabase.storage
    .from('chunks-temp')
    .remove(oldChunks.map(f => f.name))
}
```

### 3. Compresión de Chunks
```typescript
// Comprimir chunks antes de subir (reduce bandwidth)
import pako from 'pako'

const compressed = pako.gzip(chunkBuffer)
await supabase.storage
  .from('chunks-temp')
  .upload(fileName, compressed)
```

### 4. Checksums para Integridad
```typescript
// Verificar integridad con hash SHA256
import crypto from 'crypto'

const hash = crypto.createHash('sha256')
  .update(chunkBuffer)
  .digest('hex')

// Incluir en metadata
metadata.chunkHash = hash
```

## Referencias

- [Vercel Limits](https://vercel.com/docs/concepts/limits/overview)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Next.js File Uploads](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#request-body)
