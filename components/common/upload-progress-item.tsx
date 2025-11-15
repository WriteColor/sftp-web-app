"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, CheckCircle, AlertCircle, FileIcon, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MediaViewer } from "../view/media-viewer"

interface UploadProgressItemProps {
  file: File
  onRemove: () => void
  isUploading: boolean
  fileSize: string
}

export function UploadProgressItem({ file, onRemove, isUploading, fileSize }: UploadProgressItemProps) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"pending" | "sanitizing" | "ready" | "uploading" | "success" | "error">("pending")
  const [errorMessage, setErrorMessage] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [openPreview, setOpenPreview] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  useEffect(() => {
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    const handleProgress = (event: CustomEvent) => {
      if (event.detail.fileName === file.name) {
        setProgress(event.detail.progress)
        setStatus(event.detail.status)
        if (event.detail.statusMessage) {
          setStatusMessage(event.detail.statusMessage)
        }
        if (event.detail.error) {
          setErrorMessage(event.detail.error)
        }
      }
    }

    window.addEventListener("fileProgress", handleProgress as EventListener)
    return () => {
      window.removeEventListener("fileProgress", handleProgress as EventListener)
    }
  }, [file.name])

  const isTextFile = (mimeType: string) => {
    return (
      mimeType.startsWith("text/") ||
      mimeType.match(
        /\.(txt|log|cfg|conf|ini|csv|tsv|json|yaml|yml|xml|html|htm|xhtml|md|rst|nfo|diz|properties|toml|c|h|cpp|hpp|cc|cxx|cs|java|py|rb|go|rs|swift|kt|kts|php|pl|lua|m|r|scala|dart|sh|bash|zsh|bat|cmd|ps1|ahk|vbs|ts|tsx|js|jsx|coffee|scss|sass|less|css|jsonld|svg|rss|atom|env|htaccess|reg|plist|desktop|service|dockerfile|gitattributes|gitignore|editorconfig|scm|rpy|dat|tex|bib|sql|lic|manifest|srt|vtt|ass|ssa)$/i,
      )
    )
  }

  const getStatusColor = () => {
    if (status === "error") return "bg-red-500"
    if (status === "success") return "bg-green-500"
    if (status === "sanitizing") return "bg-purple-500"
    if (status === "ready") return "bg-blue-400/40"
    return "bg-blue-500"
  }

  const getStatusText = () => {
    if (status === "error") return `Error: ${errorMessage}`
    if (status === "success") return "✓ Subido correctamente"
    if (status === "sanitizing") return `Sanitizando... ${progress}%`
    if (status === "ready") return "✓ Listo para subir"
    if (status === "uploading") return `Subiendo archivo... ${progress}%`
    return "⏳ Pendiente"
  }

  const handlePreviewClick = () => {
    if (previewUrl || isTextFile(file.type)) {
      setOpenPreview(true)
    }
  }

  return (
    <>
      <div className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-sm">
        <div className="flex items-center gap-4 p-4">
          {/* Preview/Icon */}
          <div className="shrink-0 cursor-pointer relative" onClick={handlePreviewClick}>
            {previewUrl ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-primary/30 transition-all">
                {file.type.startsWith("video/") ? (
                  <>
                    <video src={previewUrl} className="w-full h-full object-cover" muted loop />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-6 w-6 text-white fill-white drop-shadow-lg" />
                    </div>
                  </>
                ) : (
                  <>
                    <Image
                      src={previewUrl || "/placeholder.svg"}
                      alt={file.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                  </>
                )}
              </div>
            ) : isTextFile(file.type) ? (
              <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-muted/50 ring-1 ring-border group-hover:ring-primary/30 transition-all">
                <FileIcon className="h-7 w-7 text-muted-foreground" />
              </div>
            ) : (
              <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-muted/50 ring-1 ring-border">
                <FileIcon className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* File Info & Progress */}
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* File name and size */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground leading-tight">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{fileSize}</p>
              </div>
              
              {/* Status Icons */}
              <div className="flex items-center gap-2 shrink-0">
                {status === "success" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Completado</span>
                  </div>
                )}
                {status === "error" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Error</span>
                  </div>
                )}
                {!isUploading && status !== "uploading" && status !== "success" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {status !== "success" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${
                    status === "error" 
                      ? "text-red-600 dark:text-red-400" 
                      : status === "sanitizing"
                        ? "text-purple-600 dark:text-purple-400"
                        : status === "ready"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground"
                  }`}>
                    {status === "error" 
                      ? "Error" 
                      : status === "sanitizing" 
                        ? "Procesando archivo..." 
                        : status === "ready"
                          ? "Listo para subir"
                          : status === "uploading"
                            ? statusMessage || "Subiendo..."
                            : "En espera"}
                  </span>
                  {(status === "uploading" || status === "sanitizing") && (
                    <span className="text-muted-foreground font-mono">{progress}%</span>
                  )}
                </div>
                
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      status === "error"
                        ? "bg-linear-to-r from-red-500 to-red-600"
                        : status === "sanitizing"
                          ? "bg-linear-to-r from-purple-500 to-purple-600"
                          : status === "ready"
                            ? "bg-linear-to-r from-blue-400 to-blue-500"
                            : "bg-linear-to-r from-primary to-primary/80"
                    }`}
                    style={{ 
                      width: status === "ready" ? "100%" : `${Math.max(progress, 2)}%`,
                    }}
                  >
                    {(status === "uploading" || status === "sanitizing") && progress > 0 && (
                      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    )}
                  </div>
                </div>

                {/* Error message */}
                {status === "error" && errorMessage && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 line-clamp-2">{errorMessage}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="truncate">{file.name}</DialogTitle>
            <DialogDescription>{fileSize}</DialogDescription>
          </DialogHeader>
          <div className="h-[calc(95vh-120px)]">
            {(previewUrl || isTextFile(file.type)) && (
              <MediaViewer src={previewUrl || "data:text/plain,"} alt={file.name} mimeType={file.type} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
