-- Crear tabla para registros de subida
CREATE TABLE IF NOT EXISTS upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modificar tabla sftp_files para agregar relación con upload_batches
ALTER TABLE sftp_files 
ADD COLUMN IF NOT EXISTS upload_batch_id UUID REFERENCES upload_batches(id) ON DELETE CASCADE;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sftp_files_upload_batch_id ON sftp_files(upload_batch_id);

-- Habilitar RLS en upload_batches
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ajustar según necesidades de autenticación)
CREATE POLICY "Allow all operations on upload_batches" ON upload_batches
  FOR ALL USING (true) WITH CHECK (true);
