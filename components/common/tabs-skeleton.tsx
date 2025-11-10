import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton para los tabs (Subir/Galería)
 */
export function TabsSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tabs list */}
      <div className="grid w-full grid-cols-2 max-w-sm sm:max-w-md bg-muted p-1 rounded-md gap-1">
        <Skeleton className="h-9 bg-muted-foreground/20 rounded-md animate-pulse" />
        <Skeleton className="h-9 bg-muted-foreground/20 rounded-md animate-pulse" />
      </div>
      
      {/* Tabs content area */}
      <div className="space-y-4 mt-4 sm:mt-6">
        <Skeleton className="h-64 w-full bg-muted/70 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
