-- Tabla para almacenar metadata de archivos subidos al servidor SFTP
create table if not exists public.sftp_files (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  original_filename text not null,
  file_path text not null,
  file_size bigint not null,
  mime_type text not null,
  uploaded_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Habilitar Row Level Security
alter table public.sftp_files enable row level security;

-- Políticas RLS: permitir lectura pública (puedes ajustar según necesites autenticación)
create policy "sftp_files_select_all"
  on public.sftp_files for select
  using (true);

-- Política para insertar (solo desde el servidor)
create policy "sftp_files_insert_all"
  on public.sftp_files for insert
  with check (true);

-- Política para eliminar
create policy "sftp_files_delete_all"
  on public.sftp_files for delete
  using (true);

-- Índices para mejorar el rendimiento
create index if not exists idx_sftp_files_filename on public.sftp_files(filename);
create index if not exists idx_sftp_files_uploaded_at on public.sftp_files(uploaded_at desc);
