import { getWebCrypto } from "@/lib/webcrypto"

function toBase64Url(bytes: Uint8Array) {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function fromBase64Url(input: string) {
  const b64 = input
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=")
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export async function encryptBlob(
  key: CryptoKey,
  blob: Blob,
): Promise<{ encrypted: ArrayBuffer; iv: string }> {
  const wc = getWebCrypto()
  const iv = wc.getRandomValues(new Uint8Array(12))
  const data = await blob.arrayBuffer()
  const ciphertext = await wc.subtle.encrypt({ name: "AES-GCM", iv }, key, data)
  return { encrypted: ciphertext, iv: toBase64Url(iv) }
}

export async function decryptBlob(
  key: CryptoKey,
  encrypted: ArrayBuffer,
  ivB64u: string,
  mimeType: string,
): Promise<Blob> {
  const { subtle } = getWebCrypto()
  const iv = fromBase64Url(ivB64u)
  const plain = await subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted)
  return new Blob([plain], { type: mimeType || "application/octet-stream" })
}

export async function compressImage(
  file: File,
  maxDim = 1920,
  quality = 0.85,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    return new Blob([await file.arrayBuffer()], { type: file.type })
  }

  const skipCompressBytes = 500 * 1024
  if (file.size < skipCompressBytes) {
    return file
  }

  const isAnimatedGif = file.type === "image/gif"
  if (isAnimatedGif) {
    return file
  }

  return new Promise<Blob>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"))
    reader.onload = () => {
      const src = reader.result as string
      const img = new Image()
      img.onerror = () => reject(new Error("Falha ao decodificar imagem"))
      img.onload = () => {
        const { width, height } = img
        if (width <= maxDim && height <= maxDim) {
          resolve(file)
          return
        }
        const ratio = Math.min(maxDim / width, maxDim / height)
        const targetW = Math.max(1, Math.round(width * ratio))
        const targetH = Math.max(1, Math.round(height * ratio))

        const canvas = document.createElement("canvas")
        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file)
          return
        }
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, targetW, targetH)

        const outType = file.type === "image/png" ? "image/png" : "image/jpeg"
        const outQuality = outType === "image/jpeg" ? quality : undefined
        canvas.toBlob(
          blob => {
            if (!blob) {
              resolve(file)
              return
            }
            if (blob.size < file.size) {
              resolve(blob)
            } else {
              resolve(file)
            }
          },
          outType,
          outQuality,
        )
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}
