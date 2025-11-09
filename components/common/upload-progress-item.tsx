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
      <div className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors">
        <div className="shrink-0 cursor-pointer relative group" onClick={handlePreviewClick}>
          {previewUrl ? (
            <div className="relative w-14 h-14">
              {file.type.startsWith("video/") ? (
                <>
                  <video src={previewUrl} className="w-14 h-14 object-cover rounded-md" muted loop />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                </>
              ) : (
                <>
                  <Image
                    src={previewUrl || "/placeholder.svg"}
                    alt={file.name}
                    width={56}
                    height={56}
                    className="w-14 h-14 object-cover rounded-md"
                    unoptimized
                  />
                  <div className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/10 transition-colors" />
                </>
              )}
            </div>
          ) : isTextFile(file.type) ? (
            <div className="w-14 h-14 flex items-center justify-center rounded-md bg-muted border border-border group-hover:border-primary/50 transition-colors">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : (
            <div className="w-14 h-14 flex items-center justify-center rounded-md bg-muted">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <p className="text-sm font-semibold truncate text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{fileSize}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                {/* Contenedor de la barra de progreso con texto superpuesto */}
                <div className="relative h-7 w-full overflow-hidden rounded-md bg-muted">
                  {/* Barra de progreso */}
                  <div
                    className={`h-full transition-all duration-300 ${
                      status === "error"
                        ? "bg-red-500"
                        : status === "success"
                          ? "bg-green-500"
                          : status === "sanitizing"
                            ? "bg-purple-500"
                            : status === "ready"
                              ? "bg-blue-400/40"
                              : "bg-blue-500"
                    }`}
                    style={{ width: status === "ready" ? "100%" : `${progress}%` }}
                  />
                  {/* Texto superpuesto con mejor contraste */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`text-xs font-bold ${
                        status === "ready"
                          ? "text-foreground"
                          : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                      }`}
                      style={{
                        textShadow: status === "ready" ? "none" : "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)",
                      }}
                    >
                      {getStatusText()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          {status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
          {status === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
          {!isUploading && status !== "uploading" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
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
