# 🔒 Seguridad del Proyecto

Este documento detalla todas las medidas de seguridad implementadas en el Cliente SFTP Web.

## Headers de Seguridad HTTP

### 1. Content Security Policy (CSP)
Protege contra ataques XSS y de inyección de código.

### 2. X-Content-Type-Options
Previene ataques de tipo MIME sniffing.
```
X-Content-Type-Options: nosniff
```

### 3. X-Frame-Options
Protege contra ataques de clickjacking.
```
X-Frame-Options: DENY
```

### 4. X-XSS-Protection
Activa la protección XSS del navegador.
```
X-XSS-Protection: 1; mode=block
```

### 5. Strict-Transport-Security (HSTS)
Fuerza el uso de HTTPS.
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 6. Referrer-Policy
Controla la información enviada en el header Referer.
```
Referrer-Policy: strict-origin-when-cross-origin
```

### 7. Permissions-Policy
Controla el acceso a características del navegador.
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

## Protección en API Routes

### Validaciones Implementadas

1. **Rate Limiting**
   - Upload: 10 solicitudes por minuto
   - Otros endpoints: 30 solicitudes por minuto
   - Por dirección IP

2. **Validación de UUID**
   - Todos los IDs se validan con regex UUID v4
   - Previene inyección SQL y path traversal

3. **Validación de Content-Type**
   - Solo se aceptan requests con `application/json`
   - Previene ataques CSRF

4. **Sanitización de Strings**
   - Eliminación de caracteres peligrosos: `<`, `>`
   - Eliminación de `javascript:` y event handlers
   - Trim de espacios

5. **Validación de Tipos MIME**
   - Lista blanca de tipos permitidos
   - Rechazo de archivos ejecutables

## Sanitización de Archivos

### Metadatos Eliminados

- **GPS/Ubicación**: Latitud, longitud, altitud
- **EXIF**: Cámara, modelo, fabricante, configuración
- **Fechas**: Creación, modificación, captura original
- **Software**: Editor, versión, herramientas
- **Scripts**: Código oculto en imágenes

### Proceso de Sanitización

1. Carga del archivo en memoria
2. Recodificación usando Canvas API (imágenes)
3. Eliminación de metadatos de fecha (videos/documentos)
4. Creación de nuevo archivo sin metadatos
5. Validación de integridad

## Seguridad en Base de Datos

### Supabase (PostgreSQL)

1. **Row Level Security (RLS)**
   - Habilitado en todas las tablas
   - Control de acceso granular

2. **Consultas Parametrizadas**
   - Prevención de inyección SQL
   - Uso de prepared statements

3. **Validación de Datos**
   - Constraints en nivel de base de datos
   - Validación de tipos

## Seguridad SFTP

### Conexiones

1. **Credenciales Seguras**
   - Variables de entorno server-side
   - No se exponen al cliente
   - Encriptación en tránsito

2. **Validación de Configuración**
   - Host, puerto, credenciales requeridos
   - Validación de formato

3. **Timeouts**
   - Conexiones con timeout configurado
   - Cierre automático de conexiones

## Prevención de Vulnerabilidades Comunes

### ✅ Implementado

- [x] **SQL Injection**: Consultas parametrizadas, validación UUID
- [x] **XSS (Cross-Site Scripting)**: CSP, sanitización, Content-Type headers
- [x] **CSRF (Cross-Site Request Forgery)**: Content-Type validation, same-origin
- [x] **Clickjacking**: X-Frame-Options DENY
- [x] **MIME Sniffing**: X-Content-Type-Options nosniff
- [x] **Path Traversal**: Sanitización de nombres, validación UUID
- [x] **File Upload Attacks**: Validación MIME, tamaño, sanitización
- [x] **Rate Limiting**: Límites por IP y endpoint
- [x] **Information Disclosure**: Headers seguros, mensajes genéricos de error
- [x] **Mixed Content**: upgrade-insecure-requests en CSP

## Configuración de Producción

### Variables de Entorno Requeridas

```env
# Supabase (público)

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# SFTP (server-side only)

NEXT_PUBLIC_SFTP_HOST=tu-servidor.com

NEXT_PUBLIC_SFTP_PORT=22

NEXT_PUBLIC_SFTP_USERNAME=usuario

SFTP_PASSWORD=password_seguro
```

### Despliegue en Vercel

1. **Environment Variables**
   - Configurar todas las variables en el dashboard
   - `SFTP_PASSWORD` debe ser secreta (no prefijo PUBLIC)

2. **Headers**
   - Configurados en `next.config.mjs`
   - Reforzados en `middleware.ts`

3. **HTTPS**
   - Automático en Vercel
   - HSTS preload habilitado

## Monitoreo y Auditoría

### Logs de Seguridad

- Requests bloqueados por rate limiting
- Intentos de acceso con UUIDs inválidos
- Errores de validación de Content-Type
- Fallos de conexión SFTP

### Recomendaciones

1. **Revisar logs regularmente**
2. **Actualizar dependencias semanalmente**
3. **Realizar escaneos de seguridad mensuales**
4. **Revisar y actualizar CSP según necesidades**
5. **Monitorear intentos de acceso no autorizado**

## Herramientas de Testing

### Escaneo de Seguridad

- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers](https://securityheaders.com/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [OWASP ZAP](https://www.zaproxy.org/)

### Comandos de Verificación

```bash
# Verificar headers
curl -I https://suban-cosas.colorsito.me/

# Escanear puertos
nmap suban-cosas.colorsito.me

# Test de SSL
openssl s_client -connect suban-cosas.colorsito.me:443
```

## Contacto de Seguridad

Si descubres una vulnerabilidad de seguridad, por favor:

1. **NO** abras un issue público
2. Envía un email a: [contacto@jeremerc.website]
3. Incluye detalles de la vulnerabilidad
4. Espera respuesta antes de divulgar públicamente

## Actualizaciones

- **Última revisión**: Noviembre 2025
- **Próxima auditoría**: Diciembre 2025

---

**Mantenido por**: Write_Color  
**Licencia**: MIT
