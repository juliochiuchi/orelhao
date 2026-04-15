import { getWebCrypto } from "@/lib/webcrypto"

const enc = new TextEncoder()
const dec = new TextDecoder()

export type EncryptedPayload = {
  iv: string
  data: string
}

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

export async function generateKey() {
  const { subtle } = getWebCrypto()
  return subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ])
}

export async function exportKey(key: CryptoKey) {
  const { subtle } = getWebCrypto()
  const raw = await subtle.exportKey("raw", key)
  return toBase64Url(new Uint8Array(raw))
}

export async function importKey(secret: string) {
  const { subtle } = getWebCrypto()
  const raw = fromBase64Url(secret)
  return subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"])
}

export async function sha256(text: string) {
  const { subtle } = getWebCrypto()
  const hash = await subtle.digest("SHA-256", enc.encode(text))
  return toBase64Url(new Uint8Array(hash))
}

export async function encrypt(key: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const wc = getWebCrypto()
  const iv = wc.getRandomValues(new Uint8Array(12))
  const ct = await wc.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext))
  return { iv: toBase64Url(iv), data: toBase64Url(new Uint8Array(ct)) }
}

export async function decrypt(key: CryptoKey, payload: EncryptedPayload) {
  const { subtle } = getWebCrypto()
  const iv = fromBase64Url(payload.iv)
  const data = fromBase64Url(payload.data)
  const pt = await subtle.decrypt({ name: "AES-GCM", iv }, key, data)
  return dec.decode(pt)
}
