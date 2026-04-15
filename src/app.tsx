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

  return (
    <AppShell>
      {session ? (
        <ChatView
          roomCode={session.roomCode}
          myName={session.myName}
          myId={myId}
          roomKey={session.key}
          invite={session.invite}
          onLeave={() => setSession(null)}
        />
      ) : (
        <Home onConnected={s => setSession(s)} />
      )}
    </AppShell>
  )
}
