# Sistema de Subida por Chunks (Chunked Upload)

## 🎯 Problema Resuelto

En producción (Vercel), los archivos grandes (>15MB) fallaban al subirse debido a límites de timeout:
- **Hobby Plan**: 10 segundos máximo
- **Pro Plan**: 60 segundos máximo

## ✅ Solución Implementada

Se implementó un sistema de **chunked upload** que divide archivos grandes en partes pequeñas (5MB cada una) y los sube de forma secuencial, evitando timeouts.

## 🏗️ Arquitectura

### 1. **Archivos Pequeños (< 15MB)**
- Usan la ruta tradicional `/api/sftp/upload`
- Se suben de una sola vez
- Timeout: 60 segundos

### 2. **Archivos Grandes (≥ 15MB)**
- Se dividen en chunks de 5MB
- Cada chunk se sube por separado a `/api/sftp/upload-chunk`
- Al terminar, se ensamblan en `/api/sftp/complete-upload`
- Timeout por chunk: 30 segundos
- Timeout de finalización: 60 segundos

## 📁 Archivos Creados/Modificados

### Nuevas API Routes

1. **`/app/api/sftp/upload-chunk/route.ts`**
   - Recibe y guarda cada chunk temporalmente
   - Timeout: 30 segundos
   - Rate limit: 30 chunks/minuto

2. **`/app/api/sftp/complete-upload/route.ts`**
   - Ensambla todos los chunks
   - Sube el archivo completo al SFTP
   - Guarda metadata en Supabase
   - Limpia archivos temporales
   - Timeout: 60 segundos

### Hook Personalizado

3. **`/hooks/use-chunked-upload.ts`**
   - Maneja la lógica de división de archivos
   - Sube chunks secuencialmente
   - Reporta progreso real (no simulado)
   - Soporta cancelación de uploads

### Utilidad de Limpieza

4. **`/lib/chunk-cleanup.ts`**
   - Limpia chunks temporales automáticamente
   - Elimina archivos >1 hora de antigüedad
   - Se ejecuta cada 30 minutos

### Componente Actualizado

5. **`/components/common/file-upload.tsx`**
   - Ahora usa `useChunkedUpload` en lugar de Server Actions
   - Muestra progreso real de subida
   - Maneja archivos grandes sin problemas

### Configuración

6. **`vercel.json`**
   - Define timeouts específicos por ruta
   - Optimizado para el plan de Vercel

## 🔄 Flujo de Subida

### Archivo Pequeño (< 15MB)
```
Usuario → FileUpload → /api/sftp/upload → SFTP Server → Supabase
```

### Archivo Grande (≥ 15MB)
```
Usuario → FileUpload → useChunkedUpload
    ↓
Divide en chunks de 5MB
    ↓
Para cada chunk:
    /api/sftp/upload-chunk → Temp Storage (/tmp/sftp-chunks/)
    ↓
Todos los chunks subidos
    ↓
/api/sftp/complete-upload → Ensambla → SFTP Server → Supabase
    ↓
Limpia archivos temporales
```

## 📊 Ventajas

✅ **Sin timeouts**: Cada chunk se sube en <30s
✅ **Progreso real**: El usuario ve el avance exacto (0-100%)
✅ **Cancelable**: Se puede cancelar la subida en cualquier momento
✅ **Resiliente**: Si falla un chunk, solo se reintenta ese chunk
✅ **Limpieza automática**: Los archivos temporales se eliminan automáticamente

## 🚀 Límites Actuales

- **Tamaño máximo por archivo**: 500MB
- **Tamaño por chunk**: 5MB
- **Archivos simultáneos**: 20 máximo
- **Rate limit chunks**: 30 chunks/minuto
- **Tiempo máximo de subida**: Ilimitado (chunks secuenciales)

## 🔧 Configuración de Timeout

En `vercel.json`:
```json
{
  "functions": {
    "app/api/sftp/upload-chunk/route.ts": {
      "maxDuration": 30
    },
    "app/api/sftp/complete-upload/route.ts": {
      "maxDuration": 60
    }
  }
}
```

## 📈 Ejemplos de Tiempo de Subida

| Tamaño | Chunks | Tiempo Estimado |
|--------|--------|-----------------|
| 15 MB  | 3      | ~15 segundos    |
| 50 MB  | 10     | ~30 segundos    |
| 150 MB | 30     | ~1.5 minutos    |
| 500 MB | 100    | ~5 minutos      |

*Tiempos varían según velocidad de internet y latencia del servidor SFTP*

## 🐛 Debugging

Si hay problemas con la subida:

1. **Verifica logs en Vercel**: Busca errores en los logs de las funciones
2. **Verifica chunks temporales**: Los chunks se guardan en `/tmp/sftp-chunks/`
3. **Verifica rate limit**: Puede estar bloqueando demasiadas peticiones
4. **Verifica configuración SFTP**: Asegúrate que el servidor SFTP esté accesible

## 📝 Notas Importantes

- Los chunks se guardan temporalmente en el filesystem del servidor (Vercel usa `/tmp/`)
- Los chunks se limpian automáticamente después de 1 hora
- El sistema es compatible con el upload tradicional (archivos <15MB)
- La transición entre sistemas es transparente para el usuario
