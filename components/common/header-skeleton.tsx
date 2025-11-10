import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton para el header de la aplicación
 */
export function HeaderSkeleton() {
  return (
    <div className="mb-6 sm:mb-8 lg:mb-10 space-y-4">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="space-y-3 w-full">
          {/* Título */}
          <Skeleton className="h-10 sm:h-12 lg:h-14 w-full max-w-2xl bg-muted/70 animate-pulse" />
          
          {/* Subtítulo/descripción */}
          <Skeleton className="h-5 sm:h-6 w-full max-w-xl bg-muted/60 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
