/**
 * Utilidades para mejorar el rendimiento y evitar warnings de violación
 */

/**
 * Debounce: Retrasa la ejecución de una función hasta que hayan pasado X ms sin llamarla
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle: Limita la ejecución de una función a una vez cada X ms
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Ejecuta una función cuando el navegador esté inactivo
 */
export function runWhenIdle(callback: () => void, timeout: number = 1000): void {
  if (typeof window === "undefined") {
    return
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout })
  } else {
    setTimeout(callback, timeout)
  }
}

/**
 * Divide una operación grande en chunks pequeños para no bloquear el UI
 */
export async function processInChunks<T>(
  items: T[],
  chunkSize: number,
  processor: (item: T, index: number) => void | Promise<void>,
  onProgress?: (processed: number, total: number) => void,
): Promise<void> {
  const total = items.length
  let processed = 0

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = items.slice(i, Math.min(i + chunkSize, total))

    for (let j = 0; j < chunk.length; j++) {
      await processor(chunk[j], i + j)
      processed++

      if (onProgress) {
        onProgress(processed, total)
      }
    }

    // Dar tiempo al navegador para renderizar entre chunks
    await new Promise((resolve) => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => resolve(true))
      } else {
        setTimeout(resolve, 0)
      }
    })
  }
}

/**
 * Medidor de rendimiento simple
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map()

  start(label: string): void {
    this.marks.set(label, performance.now())
  }

  end(label: string): number {
    const start = this.marks.get(label)
    if (!start) {
      console.warn(`No start mark found for "${label}"`)
      return 0
    }

    const duration = performance.now() - start
    this.marks.delete(label)
    return duration
  }

  measure(label: string, fn: () => void): number {
    const start = performance.now()
    fn()
    return performance.now() - start
  }

  async measureAsync(label: string, fn: () => Promise<void>): Promise<number> {
    const start = performance.now()
    await fn()
    return performance.now() - start
  }
}

/**
 * Precargar imagen de forma lazy
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

/**
 * Obtener el tamaño de un blob/file de forma eficiente
 */
export function getBlobSize(blob: Blob): string {
  const bytes = blob.size
  const sizes = ["Bytes", "KB", "MB", "GB"]
  if (bytes === 0) return "0 Bytes"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Verificar si el navegador soporta una característica
 */
export const browserSupports = {
  cacheAPI: typeof window !== "undefined" && "caches" in window,
  indexedDB: typeof window !== "undefined" && "indexedDB" in window,
  serviceWorker: typeof window !== "undefined" && "serviceWorker" in navigator,
  webWorker: typeof window !== "undefined" && typeof Worker !== "undefined",
  requestIdleCallback:
    typeof window !== "undefined" && "requestIdleCallback" in window,
  intersectionObserver:
    typeof window !== "undefined" && "IntersectionObserver" in window,
}
