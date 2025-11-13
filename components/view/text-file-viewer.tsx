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
  const [isMarkdown, setIsMarkdown] = useState(false)

  const isMarkdownFile = (filename: string): boolean => {
    return /\.(md|markdown)$/i.test(filename)
  }

  const parseMarkdown = (text: string): string => {
    // Simple markdown to HTML conversion
    const html = text
      // Headers
      .replace(/^### (.*?)$/gm, '<h3 style="font-size: 1.2em; font-weight: bold; margin: 0.8em 0 0.4em;">$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2 style="font-size: 1.4em; font-weight: bold; margin: 1em 0 0.5em;">$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1 style="font-size: 1.8em; font-weight: bold; margin: 1.2em 0 0.6em;">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
      .replace(/__( .*?)__/g, '<strong style="font-weight: bold;">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
      .replace(/_( .*?)_/g, '<em style="font-style: italic;">$1</em>')
      // Code blocks
      .replace(
        /```(.*?)```/gs,
        '<pre style="background: var(--muted); padding: 1em; border-radius: 0.5em; overflow-x: auto;"><code>$1</code></pre>',
      )
      // Inline code
      .replace(
        /`(.*?)`/g,
        '<code style="background: var(--muted); padding: 0.2em 0.4em; border-radius: 0.25em; font-family: monospace;">$1</code>',
      )
      // Links
      .replace(
        /\[(.*?)\]$$(.*?)$$/g,
        '<a href="$2" style="color: var(--primary); text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>',
      )
      // Blockquotes
      .replace(
        /^> (.*?)$/gm,
        '<blockquote style="border-left: 3px solid var(--muted-foreground); padding-left: 1em; margin: 0.5em 0; color: var(--muted-foreground);">$1</blockquote>',
      )
      // Line breaks
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br />")

    return html
  }

  useEffect(() => {
    const loadFile = async () => {
      try {
        setLoading(true)
        const response = await fetch(src)
        if (!response.ok) throw new Error("Failed to load file")
        const text = await response.text()

        const isMarkdown = isMarkdownFile(filename)
        setIsMarkdown(isMarkdown)

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
  }, [src, filename])

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
        {isMarkdown ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-foreground"
            dangerouslySetInnerHTML={{
              __html: parseMarkdown(content),
            }}
          />
        ) : (
          <pre className="font-mono text-xs whitespace-pre-wrap wrap-break-words text-foreground bg-muted p-4 rounded-lg">
            {content}
          </pre>
        )}
      </div>
    </div>
  )
}
