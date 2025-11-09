import { Skeleton } from "@/components/ui/skeleton"

export function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border rounded-lg overflow-hidden bg-card">
          <Skeleton className="aspect-square bg-slate-200 dark:bg-slate-800" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800" />
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1 bg-slate-200 dark:bg-slate-800" />
              <Skeleton className="h-8 w-10 bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
