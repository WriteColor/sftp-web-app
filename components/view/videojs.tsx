"use client"

import { useEffect, useRef } from "react"
import videojs from "video.js"
import "video.js/dist/video-js.css"

// Importar plugins solo una vez
let pluginsLoaded = false

interface VideoJSProps {
  options: any
  onReady?: (player: any) => void
}

// Cargar plugins solo una vez en el cliente
if (typeof window !== "undefined" && !pluginsLoaded) {
  require("videojs-contrib-quality-levels")
  require("videojs-http-source-selector")
  pluginsLoaded = true
}

export default function VideoJS({ options, onReady }: VideoJSProps) {
  const playerRef = useRef<any>(null)
  const videoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!videoRef.current) return

    if (!playerRef.current) {
      const videoElement = document.createElement("video-js")
      videoElement.classList.add("vjs-big-play-centered", "video-js")
      videoRef.current.appendChild(videoElement)

      const player = videojs(videoElement, options, () => {
        videojs.log("Player is ready")
        onReady && onReady(player)
      })

      player.ready(() => {
        // @ts-ignore - videojs-http-source-selector plugin
        if (typeof player.httpSourceSelector === "function") {
          // @ts-ignore - videojs-http-source-selector plugin
          player.httpSourceSelector({ default: "auto" })
        }
      })

      playerRef.current = player
    }

    return () => {
      const player = playerRef.current

      if (player && !player.isDisposed()) {
        player.dispose()
        playerRef.current = null
      }
    }
  }, [options, onReady])

  return (
    <div 
      data-vjs-player 
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
    </div>
  )
}
