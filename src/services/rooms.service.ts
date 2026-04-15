import { supabase } from "@/supabase"
import type { RoomRow } from "@/types/room"

export type CreateRoomInput = {
  code: string
  keyHash: string
  expiresAt?: string | null
}

export async function createRoom(input: CreateRoomInput) {
  const { error } = await supabase.from("rooms").insert({
    code: input.code,
    key_hash: input.keyHash,
    expires_at: input.expiresAt ?? null,
  })

  if (error) throw error
}

export async function getRoomByCode(code: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, code, key_hash, created_at, expires_at")
    .eq("code", code)
    .maybeSingle<RoomRow>()

  if (error) throw error
  return data
}

