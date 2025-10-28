"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, FolderOpen, ArrowLeft, Calendar, FileImage } from "lucide-react"
import type { UploadBatch } from "@/lib/types"
import { toast } from "sonner"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function UploadsPage() {
  const [uploads, setUploads] = useState<UploadBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [newUploadName, setNewUploadName] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const loadUploads = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/upload-batches")
      const data = await response.json()

      if (data.success) {
        setUploads(data.batches || [])
      } else {
        toast.error("Error al cargar registros", {
          description: data.message,
        })
      }
    } catch (err) {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUploads()
  }, [])

  const handleCreateUpload = async () => {
    if (!newUploadName.trim()) {
      toast.warning("Nombre requerido", {
        description: "Por favor ingresa un nombre para el registro",
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/upload-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUploadName }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Registro creado", {
          description: `"${newUploadName}" ha sido creado exitosamente`,
        })
        setNewUploadName("")
        setDialogOpen(false)
        loadUploads()
      } else {
        toast.error("Error al crear registro", {
          description: data.message,
        })
      }
    } catch (err) {
      toast.error("Error al crear registro")
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-balance">Registros de Subida</h1>
              <p className="text-muted-foreground text-pretty">
                Gestiona tus registros de subida y sus archivos asociados
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Registro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Registro</DialogTitle>
                  <DialogDescription>Ingresa un nombre descriptivo para este registro de subida</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del registro</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Fotos del proyecto 2025"
                      value={newUploadName}
                      onChange={(e) => setNewUploadName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateUpload()
                        }
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateUpload} disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      "Crear"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {uploads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No hay registros de subida</p>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primer registro para comenzar a organizar tus archivos
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Registro
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploads.map((upload) => (
              <Link key={upload.id} href={`/uploads/${upload.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FolderOpen className="h-8 w-8 text-primary mb-2" />
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileImage className="h-3 w-3" />
                        <span>{upload.file_count || 0}</span>
                      </div>
                    </div>
                    <CardTitle className="text-xl truncate">{upload.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(upload.created_at || "")}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
