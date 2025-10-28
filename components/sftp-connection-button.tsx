"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, Server, XCircle } from "lucide-react"
import { toast } from "sonner"

interface SFTPConnectionButtonProps {
  onConnected: (connected: boolean) => void
}

export function SFTPConnectionButton({ onConnected }: SFTPConnectionButtonProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [hasCheckedConnection, setHasCheckedConnection] = useState(false)

  // Verificar el estado de conexión al cargar
  useEffect(() => {
    const connected = localStorage.getItem("sftp_connected") === "true"
    setIsConnected(connected)
    onConnected(connected)
    setHasCheckedConnection(true)
  }, [onConnected])

  const handleConnect = async () => {
    setIsConnecting(true)

    try {
      const response = await fetch("/api/sftp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (data.success) {
        setIsConnected(true)
        localStorage.setItem("sftp_connected", "true")
        onConnected(true)
        toast.success("Conexión exitosa", {
          description: `Conectado a ${data.config?.host || "servidor SFTP"}`,
        })
      } else {
        setIsConnected(false)
        localStorage.removeItem("sftp_connected")
        onConnected(false)
        toast.error("Error de conexión", {
          description: data.message || "No se pudo conectar al servidor SFTP",
        })
      }
    } catch (error) {
      console.error("Error connecting to SFTP:", error)
      setIsConnected(false)
      localStorage.removeItem("sftp_connected")
      onConnected(false)
      toast.error("Error", {
        description: "Ocurrió un error al conectar con el servidor",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    localStorage.removeItem("sftp_connected")
    onConnected(false)
    toast.info("Desconectado", {
      description: "Se ha cerrado la sesión SFTP",
    })
  }

  if (!hasCheckedConnection) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Conexión SFTP
        </CardTitle>
        <CardDescription>
          Conéctate al servidor SFTP configurado en las variables de entorno
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Conectado</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Desconectado</span>
              </>
            )}
          </div>
          {isConnected ? (
            <Button onClick={handleDisconnect} variant="outline" size="sm">
              Desconectar
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isConnecting} size="sm">
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                "Conectar"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
