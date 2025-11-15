-- Crear bucket para almacenamiento temporal de chunks
-- Este bucket almacena partes de archivos durante el proceso de subida chunked
-- Los archivos se eliminan automáticamente después de completar la subida

-- Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chunks-temp',
  'chunks-temp',
  false, -- No público
  4718592, -- 4.5MB límite por chunk
  ARRAY['application/octet-stream']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Política de acceso: Solo usuarios autenticados pueden subir
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to chunks-temp"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chunks-temp');

-- Política de acceso: Solo usuarios autenticados pueden leer
CREATE POLICY IF NOT EXISTS "Allow authenticated downloads from chunks-temp"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chunks-temp');

-- Política de acceso: Solo usuarios autenticados pueden eliminar
CREATE POLICY IF NOT EXISTS "Allow authenticated deletes from chunks-temp"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chunks-temp');

-- Comentario
COMMENT ON TABLE storage.objects IS 'Almacenamiento temporal de chunks durante uploads grandes. Los archivos se limpian después de ensamblar.';
