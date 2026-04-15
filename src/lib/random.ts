import { getWebCrypto } from "@/lib/webcrypto"

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function randomRoomCode(length = 8) {
  let out = ""
  for (let i = 0; i < length; i++) {
    out += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return out
}

export function randomBytes(length: number) {
  const out = new Uint8Array(length)
  getWebCrypto().getRandomValues(out)
  return out
}

export function bytesToBase64Url(bytes: Uint8Array) {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const b64 = btoa(bin)
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

export function randomId() {
  return bytesToBase64Url(randomBytes(16))
}
