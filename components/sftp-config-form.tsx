"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import type { SFTPConfig } from "@/lib/types"

interface SFTPConfigFormProps {
  onConfigSaved: (config: SFTPConfig) => void
  initialConfig?: SFTPConfig
}

export function SFTPConfigForm({ onConfigSaved, initialConfig }: SFTPConfigFormProps) {
  const [config, setConfig] = useState<SFTPConfig>(
    initialConfig || {
      host: "",
      port: 22,
      username: "",
      password: "",
    },
  )
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/sftp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      const data = await response.json()

      if (data.success) {
        setTestResult({ success: true, message: "Conexión exitosa al servidor SFTP" })
        onConfigSaved(config)
      } else {
        setTestResult({ success: false, message: data.message || "Error al conectar con el servidor SFTP" })
      }
    } catch (error) {
      setTestResult({ success: false, message: "Error al probar la conexión" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración del Servidor SFTP</CardTitle>
        <CardDescription>Ingresa las credenciales de tu servidor SFTP</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="host">Host</Label>
          <Input
            id="host"
            placeholder="ejemplo.com"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="port">Puerto</Label>
          <Input
            id="port"
            type="number"
            placeholder="22"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: Number.parseInt(e.target.value) || 22 })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="username">Usuario</Label>
          <Input
            id="username"
            placeholder="usuario"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
          />
        </div>

        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </div>
          </Alert>
        )}

        <Button
          onClick={handleTest}
          disabled={testing || !config.host || !config.username || !config.password}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Probando conexión...
            </>
          ) : (
            "Probar y Guardar Configuración"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
