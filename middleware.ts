import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Para rutas de upload, establecer headers especiales
  if (request.nextUrl.pathname.startsWith('/api/sftp/upload')) {
    const response = NextResponse.next()
    
    // Headers para permitir archivos grandes
    response.headers.set('x-middleware-cache', 'no-cache')
    
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/sftp/upload',
}
