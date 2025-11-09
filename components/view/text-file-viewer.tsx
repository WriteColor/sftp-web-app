"use client"

import { useState, useEffect } from "react"
import { Download, Copy } from "lucide-react"
import { LineSpinner } from "@/components/ui/line-spinner"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface TextFileViewerProps {
  src: string
  filename: string
}

export function TextFileViewer({ src, filename }: TextFileViewerProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadFile = async () => {
      try {
        setLoading(true)
        const response = await fetch(src)
        if (!response.ok) throw new Error("Failed to load file")
        const text = await response.text()
        if (text.length > 1024 * 1024) {
          setContent(text.substring(0, 1024 * 1024) + "\n\n[Contenido truncado - archivo muy grande]")
        } else {
          setContent(text)
        }
        setError("")
      } catch (err) {
        setError("Error al cargar el archivo")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadFile()
  }, [src])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    toast.success("Contenido copiado al portapapeles")
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <LineSpinner size="40" stroke="3" speed="1" />
      </div>
    )
  }

  if (error) {
    return <div className="w-full h-full flex items-center justify-center bg-background text-destructive">{error}</div>
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="absolute right-9.5 z-10 flex gap-2 bg-background/80 backdrop-blur-sm rounded-bl-lg p-2 shadow-lg">
        <Button variant="ghost" size="icon" onClick={handleCopy} title="Copiar contenido">
          <Copy className="h-4 w-4 dark:text-white" />
        </Button>
        <Button variant="ghost" size="icon" asChild title="Descargar">
          <a href={src} download={filename}>
            <Download className="h-4 w-4 dark:text-white" />
          </a>
        </Button>
      </div>

      {/* Text content - scrollable with proper formatting */}
      <div className="flex-1 overflow-auto p-6 pt-0">
        <pre className="font-mono text-xs whitespace-pre-wrap wrap-break-words text-foreground bg-muted p-4 rounded-lg">
          {content}
        </pre>
      </div>
    </div>
  )
}
