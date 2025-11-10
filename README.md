
---

# 📁 Cliente SFTP Web

> Aplicación web para gestionar y compartir archivos en servidores **SFTP** con total seguridad y privacidad.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat\&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=flat\&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat\&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat\&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Características principales

### 🔐 Privacidad y seguridad

* **Sanitización automática de archivos:** elimina metadatos sensibles (GPS, EXIF, fechas, información de dispositivo) antes de subirlos.
* **Protección contra scripts ocultos:** elimina código malicioso embebido.
* **Conexión cifrada:** conexión directa al servidor SFTP con credenciales protegidas.

### 📤 Subida de archivos

* **Arrastrar y soltar:** interfaz intuitiva para agregar archivos.
* **Vista previa en tiempo real:** imágenes, videos y texto.
* **Progreso detallado:** sanitización + subida.
* **Soporte múltiple:** hasta 20 archivos simultáneos (máx. 150 MB cada uno).
* **Streaming optimizado:** videos grandes se transmiten con range requests para carga progresiva.

### 🖼️ Galería inteligente

* **Visualización multimedia:** imágenes, videos, GIFs y documentos.
* **Caché inteligente:** archivos se cachean automáticamente para carga instantánea.
* **Precarga automática:** imágenes y videos pequeños se precargan en segundo plano.
* **Selección múltiple y eliminación masiva.**
* **Descarga directa con un clic.**
* **Diseño responsivo:** adaptado a móvil, tablet y escritorio.
* **Notificaciones de carga:** aviso cuando archivos grandes tardan en cargar.

### ⚡ Experiencia de usuario

* **Auto-conexión** al servidor configurado.
* **Modo oscuro/claro** adaptable al sistema.
* **Notificaciones visuales claras** del estado de cada acción.
* **Interfaz moderna y accesible.**

---

## 🚀 Inicio rápido

### 📋 Requisitos previos

* Node.js ≥ 18 o [Bun](https://bun.sh)
* Cuenta gratuita en [Supabase](https://supabase.com)
* Acceso a un servidor SFTP

### 🧩 Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/WriteColor/sftp-web-app.git

# 2. Entrar al directorio
cd sftp-web-app

# 3. Instalar dependencias
npm install
# o
bun install
```

### ⚙️ Configuración

Crea un archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# SFTP (Servidor)
NEXT_PUBLIC_SFTP_HOST=tu_servidor_sftp
NEXT_PUBLIC_SFTP_PORT=22
NEXT_PUBLIC_SFTP_USERNAME=tu_usuario
SFTP_PASSWORD=tu_contraseña
```

### 🗄️ Base de datos

En tu proyecto de Supabase, ejecuta los scripts SQL del directorio `/scripts/`:

```text
001_create_files_table.sql
002_create_upload_batches_table.sql
```

### ▶️ Ejecutar el servidor

```bash
npm run dev
# o
bun dev
```

Luego abre tu navegador en **[http://localhost:3000](http://localhost:3000)**

---

## 🎯 Uso básico

1. **Conéctate al servidor:** la app usa las credenciales configuradas automáticamente.
2. **Sube archivos:** arrástralos o selecciónalos desde tu dispositivo.
3. **Sanitización automática:** los metadatos sensibles se eliminan localmente.
4. **Subida segura:** observa el progreso en tiempo real.
5. **Gestiona tu galería:** visualiza, descarga o elimina archivos fácilmente.

---

## 🛡️ Seguridad y privacidad

Los archivos se procesan **localmente en el navegador** antes de subirlos, garantizando que tus datos no salgan de tu equipo.
El sistema elimina:

* 📍 Datos GPS y de ubicación
* 🧭 Información EXIF (modelo de cámara, apertura, ISO, etc.)
* 🕓 Fechas originales de creación y modificación
* 🧨 Scripts o código oculto embebido
* 🧰 Metadatos de software o dispositivo

---

## 🛠️ Tecnologías principales

| Tecnología                                                             | Descripción                                    |
| ---------------------------------------------------------------------- | ---------------------------------------------- |
| **[Next.js 16](https://nextjs.org/)**                                  | Framework React de nueva generación            |
| **[React 18](https://reactjs.org/)**                                   | Librería de interfaces modernas                |
| **[TypeScript 5](https://www.typescriptlang.org/)**                    | Tipado estático seguro                         |
| **[Tailwind CSS 4](https://tailwindcss.com/)**                         | Framework de estilos moderno con sistema OKLCH |
| **[Supabase](https://supabase.com/)**                                  | Base de datos y autenticación                  |
| **[shadcn/ui](https://ui.shadcn.com/)**                                | Componentes accesibles y personalizables       |
| **[ssh2-sftp-client](https://www.npmjs.com/package/ssh2-sftp-client)** | Cliente SFTP para Node.js                      |

---

## 📊 Detalles técnicos

### Sanitización

* Procesamiento local mediante **Canvas API**
* Eliminación completa de metadatos **EXIF**
* Recompresión limpia de imágenes
* Compatible con imágenes, videos y documentos

### Gestión de archivos

* Selección múltiple y sincronización en tiempo real
* **Cache API nativa** para almacenamiento persistente y rápido
* **Doble caché:** Memoria RAM + Cache API para máxima velocidad
* **Range requests:** Streaming eficiente de videos grandes
* **Previsualización dinámica** con precarga inteligente
* Sistema de **progreso detallado** (sanitización + subida)
* **Notificaciones de carga lenta** cuando archivos tardan más de 7 segundos

### Seguridad

* Validación estricta de entradas
* **Rate limiting** en acciones críticas
* Conexión cifrada vía SFTP
* Cabeceras de seguridad HTTP reforzadas

---

## ⚠️ Limitaciones y consideraciones

* 📁 Tamaño máximo por archivo: **150 MB** (configurable)
* 📦 Subidas simultáneas: **20 archivos** (configurable)
* 🧩 Procesamiento local (consume recursos del cliente)
* 💡 Todos los tipos de archivo son compatibles
* ⏱️ La carga de archivos grandes depende de la velocidad de internet del usuario
* 💾 El caché persiste entre sesiones para acceso ultra-rápido

---

## 🤝 Contribuir

Las contribuciones son **bienvenidas** 🙌

1. Haz **fork** del repositorio
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Haz tus cambios y **commit** (`git commit -m 'Add AmazingFeature'`)
4. **Push** de tu rama (`git push origin feature/AmazingFeature`)
5. Abre un **Pull Request**

Consulta [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) para más detalles.

---

## 📄 Licencia

Este proyecto se distribuye bajo la **licencia MIT**.
Consulta el archivo [LICENSE](LICENSE) para más información.

---

## 💬 Soporte

¿Tienes preguntas, errores o sugerencias?

* 📫 Abre un [issue](https://github.com/WriteColor/sftp-web-app/issues)
* ⭐ Si te gusta el proyecto, ¡dale una estrella en GitHub!

---

<div align="center">

**Desarrollado con ❤️ por [Write_Color](https://github.com/WriteColor)**
Si este proyecto te fue útil, considera dejar una ⭐

</div>

---

¿Quieres que te genere **la versión en inglés** o una **versión adaptada para documentación técnica (por ejemplo, `docs/index.md`)** también?
