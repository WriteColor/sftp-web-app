# Cliente SFTP Web

Aplicación web completa para gestionar archivos en servidores SFTP con interfaz moderna y segura.

## Características

- **Configuración SFTP**: Interfaz para configurar credenciales del servidor SFTP con validación en tiempo real
- **Subida de Archivos**: 
  - Drag & drop para subir archivos
  - Validación de tamaño (máx. 50MB por archivo)
  - Límite de 20 archivos simultáneos
  - Previsualizaciones de imágenes
- **Galería de Imágenes**:
  - Grid responsivo con optimización de imágenes
  - Vista previa en modal
  - Descarga de archivos
  - Eliminación de archivos
- **Seguridad**:
  - Rate limiting para prevenir abuso
  - Validación de tipos de archivo
  - Sanitización de nombres de archivo
  - Row Level Security (RLS) en base de datos
  - Headers de seguridad en respuestas

## Tecnologías

- **Framework**: Next.js 16 con App Router
- **Base de Datos**: Supabase (PostgreSQL)
- **SFTP**: ssh2-sftp-client
- **UI**: shadcn/ui + Tailwind CSS v4
- **Validación**: Validación personalizada + sanitización
- **Optimización**: Next.js Image para imágenes optimizadas

## Instalación

1. Clona el repositorio:
\`\`\`bash
git clone <repository-url>
cd sftp-web-app
\`\`\`

2. Instala las dependencias:
\`\`\`bash
npm install
\`\`\`

3. Configura las variables de entorno:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Edita `.env.local` con tus credenciales de Supabase y SFTP.

4. Ejecuta el script SQL para crear la tabla:
\`\`\`bash
# Ejecuta el contenido de scripts/001_create_files_table.sql en tu base de datos Supabase
\`\`\`

5. Inicia el servidor de desarrollo:
\`\`\`bash
npm run dev
\`\`\`

6. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script SQL en `scripts/001_create_files_table.sql` en el SQL Editor
3. Copia las credenciales de tu proyecto a `.env.local`

## Configuración del Servidor SFTP

### Variables de Entorno (Recomendado para Producción)

Configura las variables de entorno `SFTP_HOST`, `SFTP_PORT`, `SFTP_USERNAME`, y `SFTP_PASSWORD` para que la aplicación pueda servir archivos automáticamente.

### Configuración Manual (UI)

Los usuarios pueden ingresar sus propias credenciales SFTP directamente en la interfaz web en la pestaña "Configuración".

## Estructura del Proyecto

\`\`\`
├── app/
│   ├── api/
│   │   └── sftp/
│   │       ├── test/          # Probar conexión SFTP
│   │       ├── upload/        # Subir archivos
│   │       ├── files/         # Listar y eliminar archivos
│   │       └── serve/         # Servir archivos
│   ├── layout.tsx
│   ├── page.tsx               # Página principal con tabs
│   └── globals.css
├── components/
│   ├── sftp-config-form.tsx   # Formulario de configuración
│   ├── file-upload.tsx        # Componente de subida
│   ├── image-gallery.tsx      # Galería de imágenes
│   └── ui/                    # Componentes shadcn/ui
├── lib/
│   ├── supabase/              # Clientes Supabase
│   ├── sftp-client.ts         # Cliente SFTP
│   ├── types.ts               # Tipos TypeScript
│   ├── validation.ts          # Validación y sanitización
│   ├── rate-limit.ts          # Rate limiting
│   └── encryption.ts          # Encriptación (opcional)
└── scripts/
    └── 001_create_files_table.sql  # Script de base de datos
\`\`\`

## Seguridad

- **Rate Limiting**: Límite de solicitudes por IP para prevenir abuso
- **Validación de Entrada**: Validación estricta de configuración SFTP y archivos
- **Sanitización**: Nombres de archivo sanitizados para prevenir path traversal
- **RLS**: Row Level Security habilitado en Supabase
- **Headers de Seguridad**: X-Content-Type-Options y otros headers de seguridad
- **Validación de UUID**: Validación de IDs para prevenir inyección

## Limitaciones

- Tamaño máximo por archivo: 50MB
- Máximo de archivos simultáneos: 20
- Rate limiting: 10 solicitudes por minuto para upload, 30 para servir archivos

## Mejoras Futuras

- [ ] Autenticación de usuarios con Supabase Auth
- [ ] Encriptación de credenciales SFTP en base de datos
- [ ] Soporte para múltiples configuraciones SFTP por usuario
- [ ] Búsqueda y filtrado de archivos
- [ ] Organización en carpetas
- [ ] Compartir archivos con enlaces temporales
- [ ] Compresión de imágenes antes de subir
- [ ] Soporte para más tipos de archivos (videos, documentos)

## Licencia

MIT

## Soporte

Para problemas o preguntas, abre un issue en el repositorio.
