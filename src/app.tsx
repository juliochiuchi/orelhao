import { useState } from "react"

import { ChatView } from "@/components/app/chat-view"
import { Home } from "@/components/app/home"
import { AppShell } from "@/components/app/app-shell"
import { useClientId } from "@/hooks/useClientId"

type Session = {
  roomCode: string
  myName: string
  key: CryptoKey
  invite?: string
}

export const App = () => {
  const myId = useClientId()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState<string | undefined>(undefined)

  return (
    <AppShell loading={session ? loading : false} loadingLabel={session ? loadingLabel : undefined}>
      {session ? (
        <ChatView
          roomCode={session.roomCode}
          myName={session.myName}
          myId={myId}
          roomKey={session.key}
          invite={session.invite}
          onStatusChange={status => {
            if (status === "connected" || status === "error") setLoading(false)
            if (status === "connecting") setLoading(true)
          }}
          onLeave={() => {
            setLoading(false)
            setLoadingLabel(undefined)
            setSession(null)
          }}
        />
      ) : (
        <Home
          onConnected={s => {
            setLoadingLabel("Entrando na sala…")
            setLoading(true)
            setSession(s)
          }}
        />
      )}
    </AppShell>
  )
}
