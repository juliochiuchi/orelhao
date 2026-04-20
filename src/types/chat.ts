export type ChatPlainMessage = {
  id: string
  senderId: string
  senderName: string
  text: string
  sentAt: number
}

export type ChatMessage = ChatPlainMessage & {
  mine: boolean
}

export type ChatTypingPayload = {
  senderId: string
  senderName: string
  isTyping: boolean
  sentAt: number
}

export type TypingUser = {
  senderId: string
  senderName: string
}
