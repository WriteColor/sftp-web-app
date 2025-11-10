import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function GallerySkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="group relative overflow-hidden border-border/50 hover:border-border transition-all duration-300">
          <CardContent className="p-0">
            {/* Skeleton para la imagen/video */}
            <div className="relative aspect-square overflow-hidden bg-muted">
              <Skeleton className="absolute inset-0 bg-linear-to-br from-muted via-muted/80 to-muted animate-pulse" />
              <div className="absolute inset-0 bg-linear-to-t from-background/60 via-transparent to-transparent" />
            </div>
            
            {/* Skeleton para la información del archivo */}
            <div className="p-3 space-y-2.5">
              {/* Nombre del archivo */}
              <Skeleton className="h-4 w-3/4 bg-muted/70 rounded-md animate-pulse" />
              
              {/* Metadata (tamaño y fecha) */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-16 bg-muted/60 rounded-md animate-pulse" />
                <Skeleton className="h-3 w-20 bg-muted/60 rounded-md animate-pulse" />
              </div>
              
              {/* Botones de acción */}
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-9 flex-1 bg-muted/70 rounded-md animate-pulse" />
                <Skeleton className="h-9 w-9 bg-muted/70 rounded-md animate-pulse" />
                <Skeleton className="h-9 w-9 bg-muted/70 rounded-md animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
