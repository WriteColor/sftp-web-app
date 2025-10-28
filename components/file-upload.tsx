"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, FileIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import type { SFTPConfig } from "@/lib/types"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_FILES = 20

interface FileWithPreview extends File {
  preview?: string
}

interface FileUploadProps {
  sftpConfig: SFTPConfig
  onUploadComplete: () => void
}

export function FileUpload({ sftpConfig, onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; errors?: string[] } | null>(
    null,
  )

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadResult(null)

    // Validar cantidad de archivos
    if (acceptedFiles.length > MAX_FILES) {
      setUploadResult({
        success: false,
        message: `Solo puedes subir un máximo de ${MAX_FILES} archivos a la vez`,
      })
      return
    }

    // Validar tamaño de archivos
    const oversizedFiles = acceptedFiles.filter((file) => file.size > MAX_FILE_SIZE)
    if (oversizedFiles.length > 0) {
      setUploadResult({
        success: false,
        message: `Algunos archivos exceden el tamaño máximo de 50MB`,
        errors: oversizedFiles.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`),
      })
      return
    }

    // Agregar previews para imágenes
    const filesWithPreviews = acceptedFiles.map((file) => {
      if (file.type.startsWith("image/")) {
        return Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      }
      return file
    })

    setFiles(filesWithPreviews)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: MAX_FILES,
    maxSize: MAX_FILE_SIZE,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })
      formData.append("config", JSON.stringify(sftpConfig))

      const response = await fetch("/api/sftp/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setUploadResult({
          success: true,
          message: `${data.files?.length || 0} archivo(s) subido(s) exitosamente`,
        })
        setFiles([])
        onUploadComplete()
      } else {
        setUploadResult({
          success: false,
          message: data.message || "Error al subir archivos",
          errors: data.errors,
        })
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: "Error al subir archivos al servidor",
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Archivos</CardTitle>
        <CardDescription>
          Arrastra archivos aquí o haz clic para seleccionar (máx. {MAX_FILES} archivos, 50MB cada uno)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-sm text-muted-foreground">Suelta los archivos aquí...</p>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Arrastra archivos aquí o haz clic para seleccionar</p>
              <p className="text-xs text-muted-foreground">Máximo {MAX_FILES} archivos, 50MB cada uno</p>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Archivos seleccionados ({files.length})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {file.preview ? (
                    <img
                      src={file.preview || "/placeholder.svg"}
                      alt={file.name}
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFile(index)} disabled={uploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Subiendo archivos...</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {uploadResult && (
          <Alert variant={uploadResult.success ? "default" : "destructive"}>
            <div className="flex items-start gap-2">
              {uploadResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertDescription>{uploadResult.message}</AlertDescription>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <ul className="mt-2 text-xs space-y-1">
                    {uploadResult.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Alert>
        )}

        <Button onClick={handleUpload} disabled={files.length === 0 || uploading} className="w-full">
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir {files.length} archivo(s)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
