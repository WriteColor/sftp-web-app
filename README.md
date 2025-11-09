# 📁 Cliente SFTP Web

> Aplicación web moderna para gestionar y compartir archivos en servidores SFTP con total seguridad y privacidad.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

---

## ✨ Características Principales

### 🔐 Privacidad y Seguridad
- **Sanitización automática de archivos**: Elimina metadatos sensibles (GPS, EXIF, fechas, información de dispositivo) antes de subir
- **Eliminación de scripts ocultos**: Protección contra código malicioso en imágenes
- **Conexión segura**: Conexión directa al servidor SFTP con credenciales protegidas

### 📤 Subida de Archivos
- **Arrastrar y soltar**: Interfaz intuitiva para agregar archivos
- **Vista previa en tiempo real**: Previsualización de imágenes, videos y archivos de texto
- **Progreso detallado**: Barra de progreso que muestra sanitización y subida
- **Soporte múltiple**: Sube hasta 20 archivos a la vez (máx. 50MB cada uno)

### 🖼️ Galería Inteligente
- **Visualización de medios**: Compatible con imágenes, videos, GIFs y documentos
- **Selección múltiple**: Selecciona y elimina varios archivos a la vez
- **Descarga directa**: Descarga tus archivos con un clic
- **Diseño responsivo**: Perfectamente adaptado a móviles, tablets y escritorio

### ⚡ Experiencia de Usuario
- **Auto-conexión**: Conexión automática al servidor configurado
- **Modo oscuro/claro**: Cambia entre temas según tu preferencia
- **Notificaciones**: Alertas visuales claras sobre el estado de tus acciones
- **Interfaz moderna**: Diseño limpio y profesional

---

## 🚀 Inicio Rápido

### 📋 Requisitos Previos

- Node.js 18+ o Bun
- Una cuenta de [Supabase](https://supabase.com) (gratuita)
- Acceso a un servidor SFTP

### 🔧 Instalación

1. **Clona el repositorio**
   \`\`\`bash
   git clone https://github.com/WriteColor/sftp-web-app.git
   cd sftp-web-app
   \`\`\`

2. **Instala las dependencias**
   \`\`\`bash
   npm install
   # o con bun
   bun install
   \`\`\`

3. **Configura las variables de entorno**
   
   Crea un archivo `.env.local` en la raíz del proyecto:
   \`\`\`env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

   # SFTP (Servidor)
   NEXT_PUBLIC_SFTP_HOST=tu_servidor_sftp
   NEXT_PUBLIC_SFTP_PORT=22
   NEXT_PUBLIC_SFTP_USERNAME=tu_usuario
   SFTP_PASSWORD=tu_contraseña
   \`\`\`

4. **Configura la base de datos**
   
   En tu proyecto de Supabase, ejecuta los scripts SQL ubicados en `/scripts/`:
   - `001_create_files_table.sql`
   - `002_create_upload_batches_table.sql`

5. **Inicia el servidor**
   \`\`\`bash
   npm run dev
   # o con bun
   bun dev
   \`\`\`

6. **Abre tu navegador** en [http://localhost:3000](http://localhost:3000)

---

## 🎯 Cómo Usar

1. **Conéctate al servidor**: La aplicación se conecta automáticamente usando las credenciales configuradas
2. **Sube archivos**: Arrastra archivos o haz clic para seleccionarlos
3. **Espera la sanitización**: Los archivos se limpian automáticamente eliminando metadatos sensibles
4. **Sube al servidor**: Haz clic en "Subir archivos" y observa el progreso en tiempo real
5. **Gestiona tu galería**: Visualiza, descarga o elimina archivos desde la galería

---

## 🛡️ Seguridad y Privacidad

Esta aplicación prioriza tu privacidad eliminando automáticamente:

- ✅ **Datos GPS y ubicación** de fotos
- ✅ **Información EXIF** (cámara, modelo, configuración)
- ✅ **Fechas originales** de creación y modificación
- ✅ **Scripts y código oculto** en imágenes
- ✅ **Metadatos de software** y dispositivos

Los archivos se procesan **localmente en tu navegador** antes de subir, garantizando máxima privacidad.

---

## 🛠️ Tecnologías

Esta aplicación está construida con tecnologías modernas:

- **[Next.js 16](https://nextjs.org/)** - Framework React de última generación
- **[React 18](https://reactjs.org/)** - Librería de interfaz de usuario
- **[TypeScript](https://www.typescriptlang.org/)** - Tipado estático para JavaScript
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Framework CSS con sistema OKLCH
- **[Supabase](https://supabase.com/)** - Base de datos PostgreSQL y almacenamiento
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes de UI accesibles
- **[ssh2-sftp-client](https://www.npmjs.com/package/ssh2-sftp-client)** - Cliente SFTP para Node.js

---

## 📊 Características Técnicas

### Sanitización de Archivos
- Procesamiento del lado del cliente usando Canvas API
- Recodificación de imágenes sin metadatos
- Eliminación de datos EXIF completos
- Soporte para imágenes, videos y documentos

### Gestión de Archivos
- Selección múltiple con sincronización en tiempo real
- Cache de medios para carga rápida
- Previsualización de múltiples formatos
- Sistema de progreso detallado (sanitización + subida)

### Seguridad
- Validación estricta de entradas
- Limitación de velocidad (rate limiting)
- Conexión SFTP segura
- Headers de seguridad HTTP

---

## 📝 Limitaciones

- **Tamaño máximo por archivo**: 50MB
- **Archivos simultáneos**: Máximo 20 archivos a la vez
- **Tipos de archivo**: Todos los tipos son soportados
- **Procesamiento**: La sanitización se realiza en el navegador (requiere recursos del cliente)

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para cambios importantes:

1. Haz fork del repositorio
2. Crea una rama para tu función (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## 💬 Soporte

¿Tienes preguntas o problemas? 

- 📫 Abre un [issue](https://github.com/WriteColor/sftp-web-app/issues) en GitHub
- ⭐ Si te gusta el proyecto, dale una estrella en GitHub

---

<div align="center">

**Creado por [Write_Color](https://github.com/WriteColor)**

Si este proyecto te fue útil, considera darle una ⭐

</div>
