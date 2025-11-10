import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton para el botón de conexión SFTP
 */
export function ConnectionButtonSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="h-10 sm:h-11 w-full max-w-xs bg-muted/70 rounded-md animate-pulse" />
    </div>
  )
}
