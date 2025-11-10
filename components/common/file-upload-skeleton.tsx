import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * Skeleton para la sección de subida de archivos
 */
export function FileUploadSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-48 bg-muted/70 animate-pulse" />
        <Skeleton className="h-4 w-full max-w-md bg-muted/60 animate-pulse" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Dropzone area */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 sm:p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full bg-muted/70 animate-pulse" />
            <div className="space-y-2 text-center w-full">
              <Skeleton className="h-5 w-64 mx-auto bg-muted/70 animate-pulse" />
              <Skeleton className="h-4 w-48 mx-auto bg-muted/60 animate-pulse" />
            </div>
            <Skeleton className="h-10 w-40 bg-muted/70 rounded-md animate-pulse" />
          </div>
        </div>
        
        {/* File info */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32 bg-muted/60 animate-pulse" />
          <Skeleton className="h-4 w-24 bg-muted/60 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}
