import { NextResponse } from 'next/server'

/**
 * Agrega headers de seguridad a las respuestas de las API
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers

  // Prevenir clickjacking
  headers.set('X-Frame-Options', 'DENY')
  
  // Prevenir MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff')
  
  // Activar protección XSS del navegador
  headers.set('X-XSS-Protection', '1; mode=block')
  
  // Política de referencia
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Prevenir caching de respuestas sensibles
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  headers.set('Pragma', 'no-cache')
  headers.set('Expires', '0')

  return response
}

/**
 * Crea una respuesta JSON con headers de seguridad
 */
export function secureJsonResponse(
  data: any,
  options?: { status?: number; statusText?: string }
): NextResponse {
  const response = NextResponse.json(data, options)
  return addSecurityHeaders(response)
}

/**
 * Valida que el Content-Type sea el esperado (prevención de CSRF)
 */
export function validateContentType(request: Request, expectedType = 'application/json'): boolean {
  const contentType = request.headers.get('content-type')
  return contentType?.includes(expectedType) ?? false
}

/**
 * Sanitiza strings para prevenir XSS
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/javascript:/gi, '') // Eliminar javascript:
    .replace(/on\w+=/gi, '') // Eliminar event handlers
    .trim()
}

/**
 * Valida que una URL sea segura (HTTPS o relativa)
 */
export function isSecureUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://dummy.com')
    return parsed.protocol === 'https:' || url.startsWith('/')
  } catch {
    return url.startsWith('/') // URLs relativas son seguras
  }
}

/**
 * Valida que un ID sea un UUID válido
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Headers CORS seguros para API
 */
export function getCorsHeaders(allowedOrigin?: string) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin || process.env.NEXT_PUBLIC_APP_URL || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 horas
  }
}
