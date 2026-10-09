import type { EncryptedPayload } from "@/crypto"
import { supabase } from "@/supabase"

export type InsertRoomMessageInput = {
  roomCode: string
  messageId: string
  senderId: string
  encryptedPayload: EncryptedPayload
  sentAt: number
}

export type RoomMessageRow = {
  id: string
  room_code: string
  message_id: string
  sender_id: string
  encrypted_payload: EncryptedPayload
  sent_at: string
  created_at: string
}

export async function insertRoomMessage(input: InsertRoomMessageInput) {
  const { error } = await supabase.from("room_messages").insert({
    room_code: input.roomCode,
    message_id: input.messageId,
    sender_id: input.senderId,
    encrypted_payload: input.encryptedPayload,
    sent_at: new Date(input.sentAt).toISOString(),
  })

  if (error) throw error
}

export async function listRoomMessagesAfter(
  roomCode: string,
  sentAtOrZeroMs: number,
): Promise<RoomMessageRow[]> {
  const iso = new Date(sentAtOrZeroMs).toISOString()

  const { data, error } = await supabase
    .from("room_messages")
    .select("id, room_code, message_id, sender_id, encrypted_payload, sent_at, created_at")
    .eq("room_code", roomCode)
    .gt("sent_at", iso)
    .order("sent_at", { ascending: true })

  if (error) throw error
  return (data ?? []) as RoomMessageRow[]
}
