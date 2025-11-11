/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Configuración para archivos grandes
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb', // Aumentar límite para archivos grandes
    },
  },
  
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'], // Formatos modernos con mejor compresión sin pérdida
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Configurar qualities disponibles para incluir 100
    qualities: [100, 75], // Agregar quality 100 para evitar warnings
    minimumCacheTTL: 60,
  },
  
  // Configuración vacía de turbopack para silenciar el warning
  // Esto permite usar webpack con módulos nativos de Node.js
  turbopack: {},
  
  // Configuración de webpack para módulos de Node.js nativos
  webpack: (config, { isServer }) => {
    // Excluir paquetes nativos de Node.js del bundle del cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        ssh2: false,
        'ssh2-sftp-client': false,
      }
    }
    
    return config
  },
  
  // Marcar estos paquetes como externos del servidor de Next.js
  // Esto evita que Next.js intente empaquetar módulos nativos
  serverExternalPackages: ['ssh2', 'ssh2-sftp-client'],

  // Headers de seguridad HTTP
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    return [
      {
        // Aplicar estos headers a todas las rutas
        source: '/:path*',
        headers: [
          // Content Security Policy - Protege contra XSS y ataques de inyección
          // En desarrollo es más permisivo para facilitar debugging
          {
            key: 'Content-Security-Policy',
            value: isDev 
              ? [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: blob: https:",
                  "font-src 'self' data: https://fonts.gstatic.com",
                  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
                  "media-src 'self' blob:",
                  "object-src 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                ].join('; ')
              : [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: blob: https:",
                  "font-src 'self' data:",
                  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com",
                  "media-src 'self' blob:",
                  "object-src 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                  "frame-ancestors 'none'",
                  "upgrade-insecure-requests"
                ].join('; ')
          },
          // Previene ataques de tipo MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Previene que el sitio sea embebido en un iframe (Clickjacking)
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Activa protección XSS del navegador
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Política de referencia - No envía información sensible
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions Policy - Controla características del navegador
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // Strict Transport Security - Fuerza HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      }
    ]
  }
}

export default nextConfig
