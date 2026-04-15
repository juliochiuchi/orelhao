import { useMemo } from "react"

import { randomId } from "@/lib/random"

const STORAGE_KEY = "e2ee-chat:client-id"

export function useClientId() {
  return useMemo(() => {
    try {
      const existing = sessionStorage.getItem(STORAGE_KEY)
      if (existing) return existing
      const id = randomId()
      sessionStorage.setItem(STORAGE_KEY, id)
      return id
    } catch {
      return randomId()
    }
  }, [])
}

