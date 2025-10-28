# Guía de Seguridad

## Configuración Segura

### Variables de Entorno

**NUNCA** commits archivos `.env` o `.env.local` al repositorio. Usa `.env.example` como plantilla.

### Credenciales SFTP

Las credenciales SFTP ingresadas por los usuarios en la UI se mantienen solo en memoria durante la sesión. Para producción, considera:

1. **Encriptación**: Usa el módulo `lib/encryption.ts` para encriptar credenciales antes de almacenarlas
2. **Almacenamiento Seguro**: Guarda credenciales encriptadas en Supabase con RLS
3. **Rotación de Credenciales**: Implementa rotación periódica de credenciales

### Base de Datos

- **RLS Habilitado**: Todas las tablas tienen Row Level Security
- **Políticas Estrictas**: Revisa y ajusta las políticas según tus necesidades
- **Backups**: Configura backups automáticos en Supabase

### Rate Limiting

El rate limiting actual usa memoria local. Para producción:

- Usa Redis o similar para rate limiting distribuido
- Ajusta los límites según tu caso de uso
- Considera rate limiting por usuario autenticado

### Validación de Archivos

- **Tipos de Archivo**: Implementa whitelist de tipos MIME permitidos
- **Escaneo de Malware**: Considera integrar un servicio de escaneo
- **Tamaño de Archivos**: Ajusta límites según tu infraestructura

### Headers de Seguridad

Considera añadir más headers de seguridad en `next.config.mjs`:

\`\`\`javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]
\`\`\`

## Reportar Vulnerabilidades

Si encuentras una vulnerabilidad de seguridad, por favor NO abras un issue público. Contacta directamente al equipo de desarrollo.

## Checklist de Seguridad para Producción

- [ ] Variables de entorno configuradas correctamente
- [ ] RLS habilitado y políticas revisadas
- [ ] Rate limiting con Redis implementado
- [ ] Autenticación de usuarios habilitada
- [ ] Credenciales SFTP encriptadas
- [ ] Headers de seguridad configurados
- [ ] Validación de tipos de archivo implementada
- [ ] Logs de auditoría configurados
- [ ] Backups automáticos habilitados
- [ ] Monitoreo de errores configurado
- [ ] HTTPS habilitado (automático en Vercel)
