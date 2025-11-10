import { HeaderSkeleton } from "./header-skeleton"
import { ConnectionButtonSkeleton } from "./connection-button-skeleton"
import { TabsSkeleton } from "./tabs-skeleton"

/**
 * Skeleton para toda la página principal
 * Muestra placeholders para header, botón de conexión y tabs
 */
export function PageSkeleton() {
  return (
    <main className="min-h-screen bg-linear-to-br from-background via-background to-muted/30">
      <div className="container mx-auto py-6 sm:py-8 lg:py-10 px-4 max-w-7xl">
        {/* Header skeleton */}
        <HeaderSkeleton />
        
        <div className="space-y-6 sm:space-y-8">
          {/* Connection button skeleton */}
          <ConnectionButtonSkeleton />
          
          {/* Tabs skeleton */}
          <TabsSkeleton />
        </div>
      </div>
    </main>
  )
}
