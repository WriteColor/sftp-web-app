"use client"
import { ImageZoomViewer } from "./image-zoom-viewer"
import { GifViewer } from "./gif-viewer"
import { VideoViewer } from "./video-viewer"
import { TextFileViewer } from "./text-file-viewer"

interface MediaViewerProps {
  src: string
  alt: string
  mimeType?: string
  fileId?: string
  onVideoCached?: (fileId: string, blobUrl: string) => void
}

export function MediaViewer({ src, alt, mimeType, fileId, onVideoCached }: MediaViewerProps) {
  // Priorizar mimeType sobre extensión de archivo (importante para URLs blob)
  const isGif = mimeType === "image/gif" || (!mimeType && src.toLowerCase().endsWith(".gif"))
  const isAnimatedImage = 
    mimeType === "image/gif" || 
    mimeType === "image/webp" || 
    mimeType === "image/apng" || 
    (!mimeType && isGif)

  const isVideo = 
    mimeType?.startsWith("video/") || 
    (!mimeType && src.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v)$/i))

  const isImage = 
    mimeType?.startsWith("image/") || 
    (!mimeType && src.toLowerCase().match(/\.(jpg|jpeg|png|webp|bmp|svg|ico)$/i))

  const isTextFile =
    mimeType?.startsWith("text/") ||
    mimeType?.includes("json") ||
    mimeType?.includes("xml") ||
    (!mimeType && src
      .toLowerCase()
      .match(
        /\.(txt|log|cfg|conf|ini|csv|tsv|json|yaml|yml|xml|html|htm|xhtml|md|rst|nfo|diz|properties|toml|c|h|cpp|hpp|cc|cxx|cs|java|py|rb|go|rs|swift|kt|kts|php|pl|lua|m|r|scala|dart|sh|bash|zsh|bat|cmd|ps1|ahk|vbs|ts|tsx|js|jsx|coffee|scss|sass|less|css|jsonld|svg|rss|atom|env|htaccess|reg|plist|desktop|service|dockerfile|gitattributes|gitignore|editorconfig|scm|rpy|dat|tex|bib|sql|lic|manifest|srt|vtt|ass|ssa)$/i,
      ))

  if (isVideo) {
    return <VideoViewer src={src} alt={alt} fileId={fileId} onCached={onVideoCached} />
  }

  if (isAnimatedImage) {
    return <GifViewer src={src} alt={alt} />
  }

  if (isTextFile) {
    return <TextFileViewer src={src} filename={alt} />
  }

  if (isImage) {
    return <ImageZoomViewer src={src || "/placeholder.svg"} alt={alt} />
  }

  // Fallback for unknown types
  return (
    <div className="w-full h-full flex items-center justify-center bg-background text-muted-foreground">
      Tipo de archivo no soportado
    </div>
  )
}
