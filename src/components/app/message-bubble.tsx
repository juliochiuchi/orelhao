import { useEffect, useRef, useState } from "react"
import { AlertCircle, Loader2, X, ZoomIn } from "lucide-react"

import type { ChatImageContent, ChatMessage } from "@/types/chat"
import { cn } from "@/lib/utils"
import { decryptBlob } from "@/lib/image"
import { supabase } from "@/supabase"

type ImageLoadState = "idle" | "loading" | "ready" | "error"

type ImageMeta = ChatImageContent["image"]

const objectUrlCache = new Map<string, string>()

async function resolveImageObjectUrl(
  messageId: string,
  image: ImageMeta,
  roomKey: CryptoKey,
  storageBucket: string,
  localObjectUrl?: string,
): Promise<string> {
  if (localObjectUrl) return localObjectUrl
  const cached = objectUrlCache.get(messageId)
  if (cached) return cached

  const { data, error } = await supabase.storage.from(storageBucket).download(image.storageKey)
  if (error) throw error
  if (!data) throw new Error("Sem dados")

  const plain = await decryptBlob(roomKey, await data.arrayBuffer(), image.iv, image.mimeType)
  const url = URL.createObjectURL(plain)
  objectUrlCache.set(messageId, url)
  return url
}

export function MessageBubble(props: {
  message: ChatMessage
  roomKey: CryptoKey
  storageBucket: string
}) {
  const { message: m, roomKey, storageBucket } = props
  const time = new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const initialImage = (() => {
    if (m.type !== "image") return { state: "idle" as const, url: undefined }
    if (m.localObjectUrl) return { state: "ready" as const, url: m.localObjectUrl }
    const cached = objectUrlCache.get(m.id)
    if (cached) return { state: "ready" as const, url: cached }
    return { state: "loading" as const, url: undefined }
  })()

  const [imageState, setImageState] = useState<ImageLoadState>(initialImage.state)
  const [objectUrl, setObjectUrl] = useState<string | undefined>(initialImage.url)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const unmountRevokeRef = useRef<string | undefined>(undefined)
  const inflightAbortRef = useRef<{ cancelled: boolean } | null>(null)

  useEffect(() => {
    if (m.type !== "image") return
    if (m.localObjectUrl) return
    if (imageState !== "loading") return
    if (objectUrl) return
    if (inflightAbortRef.current) return

    const handle = { cancelled: false }
    inflightAbortRef.current = handle

    resolveImageObjectUrl(m.id, m.image, roomKey, storageBucket, m.localObjectUrl)
      .then(url => {
        if (handle.cancelled) return
        if (!m.localObjectUrl) {
          unmountRevokeRef.current = url
        }
        setObjectUrl(url)
        setImageState("ready")
      })
      .catch(err => {
        console.warn("Erro ao carregar imagem:", err)
        if (handle.cancelled) return
        setImageState("error")
      })
    return () => {
      handle.cancelled = true
      if (inflightAbortRef.current === handle) inflightAbortRef.current = null
    }
  }, [m, roomKey, storageBucket, imageState, objectUrl])

  useEffect(() => {
    return () => {
      const revoke = unmountRevokeRef.current
      if (revoke && !m.localObjectUrl && objectUrlCache.has(m.id)) {
        try {
          URL.revokeObjectURL(revoke)
        } catch {
          /* ignore */
        }
        objectUrlCache.delete(m.id)
      }
    }
  }, [m.id, m.localObjectUrl])

  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false)
    }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [lightboxOpen])

  return (
    <div className={cn("flex w-full", m.mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] md:max-w-[85%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 shadow-sm ring-1",
          m.mine
            ? "bg-neutral-50 text-neutral-950 ring-neutral-200"
            : "bg-neutral-900/70 text-neutral-50 ring-white/10",
        )}
      >
        <div className="flex items-baseline justify-between gap-2 md:gap-3">
          <div className={cn("truncate text-[11px] md:text-xs font-medium", m.mine ? "text-neutral-700" : "text-neutral-300")}>
            {m.mine ? "Você" : m.senderName}
          </div>
          <div className={cn("shrink-0 text-[10px] md:text-[11px]", m.mine ? "text-neutral-500" : "text-neutral-400")}>
            {time}
          </div>
        </div>

        {m.type === "text" ? (
          <div className="mt-0.5 md:mt-1 whitespace-pre-wrap break-words text-[15px] md:text-[15px] leading-relaxed">{m.text}</div>
        ) : (
          <div className="mt-1.5 md:mt-2 space-y-2">
            <div className="relative overflow-hidden rounded-xl bg-black/10 ring-1 ring-black/5">
              {imageState === "loading" && (
                <div className="flex h-32 md:h-40 w-56 md:w-64 max-w-full items-center justify-center gap-2 text-neutral-500 dark:text-neutral-400">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-xs">Carregando…</span>
                </div>
              )}
              {imageState === "error" && (
                <div className="flex h-32 md:h-40 w-56 md:w-64 max-w-full flex-col items-center justify-center gap-1 px-3 text-center">
                  <AlertCircle className={cn("size-5", m.mine ? "text-neutral-600" : "text-neutral-400")} />
                  <span className={cn("text-xs", m.mine ? "text-neutral-600" : "text-neutral-400")}>
                    Falha ao carregar imagem
                  </span>
                </div>
              )}
              {imageState === "ready" && objectUrl ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block max-w-[240px] md:max-w-[280px] cursor-zoom-in overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                >
                  <img
                    src={objectUrl}
                    alt={m.image.fileName || "Imagem"}
                    className="block h-auto max-h-[280px] md:max-h-[360px] w-full object-cover"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white shadow">
                      <ZoomIn className="size-3.5" />
                      Ampliar
                    </span>
                  </div>
                  {m.uploadStatus === "pending" && (
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white">
                      <Loader2 className="size-3 animate-spin" />
                      Enviando…
                    </div>
                  )}
                  {m.uploadStatus === "error" && (
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-1 text-[10px] font-medium text-white">
                      <AlertCircle className="size-3" />
                      Erro
                    </div>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {lightboxOpen && objectUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 md:p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={e => {
              e.stopPropagation()
              setLightboxOpen(false)
            }}
            className="absolute right-3 md:right-4 top-[calc(env(safe-area-inset-top)+12px)] md:top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
          <div onClick={e => e.stopPropagation()} className="max-h-full max-w-full">
            <img
              src={objectUrl}
              alt={m.type === "image" ? m.image.fileName || "Imagem" : "Imagem"}
              className="block max-h-[88vh] max-w-[96vw] md:max-h-[85vh] md:max-w-[92vw] rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
