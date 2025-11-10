/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
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
    return [
      {
        // Aplicar estos headers a todas las rutas
        source: '/:path*',
        headers: [
          // Content Security Policy - Protege contra XSS y ataques de inyección
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline necesario para Next.js
              "style-src 'self' 'unsafe-inline'", // unsafe-inline necesario para Tailwind
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
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
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
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
