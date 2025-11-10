"use client"

import { useEffect, useState } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function IndexedDBWarning() {
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    // Verificar si IndexedDB está disponible
    if (typeof window !== "undefined") {
      try {
        const testDB = window.indexedDB.open("__test__")
        testDB.onerror = () => {
          setShowWarning(true)
        }
        testDB.onsuccess = () => {
          // IndexedDB funciona, cerrar la DB de prueba
          testDB.result?.close()
          window.indexedDB.deleteDatabase("__test__")
          setShowWarning(false)
        }
      } catch {
        setShowWarning(true)
      }
    }
  }, [])

  if (!showWarning) return null

  return (
    <Alert variant="default" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Caché deshabilitado</AlertTitle>
      <AlertDescription className="text-sm">
        El almacenamiento local no está disponible. Los archivos se cargarán desde el servidor cada vez.
        Esto puede afectar el rendimiento.
      </AlertDescription>
    </Alert>
  )
}
