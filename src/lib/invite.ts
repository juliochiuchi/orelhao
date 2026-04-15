export type ParsedInvite = {
  roomCode: string
  secret: string
}

export function formatInvite(roomCode: string, secret: string) {
  return `${roomCode}.${secret}`
}

export function parseInvite(input: string): ParsedInvite | null {
  const raw = input.trim()
  if (!raw) return null

  const dotParts = raw.split(".")
  let roomCodeRaw: string | null = null
  let secretRaw: string | null = null

  if (dotParts.length === 2) {
    roomCodeRaw = dotParts[0]
    secretRaw = dotParts[1]
  } else {
    const parts = raw.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      roomCodeRaw = parts[0]
      secretRaw = parts.slice(1).join("")
    }
  }

  if (!roomCodeRaw || !secretRaw) return null

  const roomCode = roomCodeRaw.trim().toUpperCase()
  const secret = secretRaw.trim()

  if (!roomCode || !secret) return null

  return { roomCode, secret }
}
