import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton para una tarjeta de archivo individual durante la carga
 */
export function FileCardSkeleton() {
  return (
    <div className="relative aspect-square overflow-hidden bg-muted rounded-lg animate-pulse">
      {/* Gradiente animado de fondo */}
      <div className="absolute inset-0 bg-linear-to-br from-muted via-muted/80 to-muted/60" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-background/10 to-transparent animate-shimmer" />
      
      {/* Icono central de placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-muted-foreground/10 flex items-center justify-center">
          <Skeleton className="h-8 w-8 bg-muted-foreground/20 rounded" />
        </div>
      </div>
      
      {/* Gradiente inferior para transición suave */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-background/60 via-transparent to-transparent" />
    </div>
  )
}
