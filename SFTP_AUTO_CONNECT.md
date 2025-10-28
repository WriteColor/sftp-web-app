# Sistema de Conexión SFTP Automática

## Descripción

Este sistema implementa una conexión SFTP persistente que:
- Usa las credenciales configuradas en las variables de entorno
- Mantiene el estado de conexión entre recargas de página
- No requiere que el usuario ingrese credenciales manualmente
- Solo necesita un clic para conectarse

## Características

### 1. Conexión Automática
- **Botón de conexión simple**: Un solo botón conecta al servidor SFTP configurado
- **Estado persistente**: La sesión se mantiene activa incluso al recargar la página o navegar
- **Variables de entorno**: Las credenciales se almacenan de forma segura en el servidor

### 2. Seguridad
- Las credenciales SFTP se mantienen en el servidor (archivo `.env` o `.env.local`)
- La contraseña NUNCA se expone al cliente
- Solo se envían al cliente los datos no sensibles (host, puerto, usuario)

### 3. Componentes Principales

#### `/components/sftp-connection-button.tsx`
Botón de conexión que:
- Muestra el estado actual (conectado/desconectado)
- Gestiona la conexión con un solo clic
- Usa `localStorage` para persistir el estado entre sesiones
- Proporciona feedback visual inmediato

#### `/app/api/sftp/connect/route.ts`
Endpoint API que:
- Lee las credenciales desde las variables de entorno
- Verifica la conexión al servidor SFTP
- Retorna el estado de conexión

#### `/lib/sftp-config.ts`
Utilidades para:
- Obtener la configuración SFTP completa del servidor
- Combinar configuraciones parciales con las del servidor
- Validar configuraciones SFTP

## Variables de Entorno Requeridas

Añade estas variables a tu archivo `.env` o `.env.local`:

```env
# Configuración SFTP del servidor (privada - solo servidor)
SFTP_HOST=tu-servidor.com
SFTP_PORT=22
SFTP_USERNAME=tu-usuario
SFTP_PASSWORD=tu-contraseña-segura

# Información pública (solo lectura, sin password)
NEXT_PUBLIC_SFTP_HOST=tu-servidor.com
NEXT_PUBLIC_SFTP_PORT=22
NEXT_PUBLIC_SFTP_USERNAME=tu-usuario
```

## Flujo de Trabajo

1. **Usuario abre la aplicación**
   - La app verifica `localStorage` para el estado de conexión previo
   - Si estaba conectado, automáticamente muestra como conectado

2. **Usuario hace clic en "Conectar"**
   - Se envía una petición a `/api/sftp/connect`
   - El servidor usa las credenciales de `.env`
   - Se verifica la conexión SFTP
   - El estado se guarda en `localStorage`

3. **Usuario sube archivos o navega**
   - El estado de conexión persiste
   - Los endpoints del servidor usan las credenciales de `.env` automáticamente
   - No se requiere reautenticación

## Endpoints API Actualizados

Todos los endpoints SFTP ahora usan `getServerSFTPConfig()` que:
- Obtiene las credenciales completas del servidor
- Completa automáticamente cualquier configuración parcial del cliente
- Garantiza que siempre se use la contraseña correcta

### Endpoints modificados:
- `/api/sftp/connect` - Conexión inicial
- `/api/sftp/upload` - Subida de archivos
- `/api/sftp/files/[id]` - Eliminación de archivos
- `/api/sftp/serve/[id]` - Servir archivos (ya usaba vars de entorno)

## Uso

### En la Aplicación

```tsx
import { SFTPConnectionButton } from "@/components/sftp-connection-button"

function MyPage() {
  const [isConnected, setIsConnected] = useState(false)
  
  return (
    <SFTPConnectionButton onConnected={setIsConnected} />
  )
}
```

### Despliegue

1. Configura las variables de entorno en tu plataforma de hosting
2. Asegúrate de que las variables con `NEXT_PUBLIC_` estén expuestas al cliente
3. Las variables sin `NEXT_PUBLIC_` solo están disponibles en el servidor

## Beneficios

✅ **Experiencia de Usuario Mejorada**: Solo un clic para conectarse
✅ **Seguridad**: Credenciales protegidas en el servidor
✅ **Persistencia**: La sesión sobrevive recargas de página
✅ **Mantenimiento Simple**: Cambios de credenciales solo en variables de entorno
✅ **Sin Formularios**: No se requiere que el usuario ingrese datos

## Notas Técnicas

- El estado de conexión se guarda en `localStorage` con la clave `sftp_connected`
- La conexión real al SFTP se hace en cada operación (upload, delete, etc.)
- El endpoint `/api/sftp/connect` solo verifica la conexión y confirma credenciales
- La arquitectura permite múltiples sesiones de navegador simultáneas
