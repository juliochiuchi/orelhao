import { exportKey, generateKey, importKey, sha256 } from "@/crypto"
import { formatInvite, parseInvite } from "@/lib/invite"
import { randomRoomCode } from "@/lib/random"
import * as roomsService from "@/services/rooms.service"

export type CreateRoomResult = {
  roomCode: string
  secret: string
  invite: string
  expiresAt: string | null
  key: CryptoKey
}

export async function createRoom(params: { expireInHours?: number | null }) {
  const roomCode = randomRoomCode()
  const key = await generateKey()
  const secret = await exportKey(key)
  const keyHash = await sha256(secret)

  const expiresAt =
    params.expireInHours && params.expireInHours > 0
      ? new Date(Date.now() + params.expireInHours * 60 * 60 * 1000).toISOString()
      : null

  await roomsService.createRoom({ code: roomCode, keyHash, expiresAt })

  return {
    roomCode,
    secret,
    invite: formatInvite(roomCode, secret),
    expiresAt,
    key,
  } satisfies CreateRoomResult
}

export type JoinRoomInput = {
  roomCode?: string
  secret?: string
  invite?: string
}

export type JoinRoomResult =
  | { ok: true; roomCode: string; key: CryptoKey }
  | {
      ok: false
      reason: "ROOM_NOT_FOUND" | "ROOM_EXPIRED" | "INVALID_SECRET" | "INVALID_INVITE"
    }

export async function joinRoom(input: JoinRoomInput): Promise<JoinRoomResult> {
  const parsed = input.invite ? parseInvite(input.invite) : null
  if (input.invite && !parsed) return { ok: false, reason: "INVALID_INVITE" }

  const roomCode = (parsed?.roomCode ?? input.roomCode ?? "").trim().toUpperCase()
  const secret = (parsed?.secret ?? input.secret ?? "").trim()

  if (!roomCode || !secret) return { ok: false, reason: "INVALID_INVITE" }

  const room = await roomsService.getRoomByCode(roomCode)
  if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" }

  if (room.expires_at && new Date(room.expires_at).getTime() <= Date.now()) {
    return { ok: false, reason: "ROOM_EXPIRED" }
  }

  const hash = await sha256(secret)
  if (hash !== room.key_hash) return { ok: false, reason: "INVALID_SECRET" }

  const key = await importKey(secret)
  return { ok: true, roomCode, key }
}
