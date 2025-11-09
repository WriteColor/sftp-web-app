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
}

export default nextConfig
