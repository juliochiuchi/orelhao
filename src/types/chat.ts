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

