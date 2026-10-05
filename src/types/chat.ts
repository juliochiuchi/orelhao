export type ChatTextContent = {
  text: string
}

export type ChatImageContent = {
  image: {
    storageKey: string
    iv: string
    mimeType: string
    size: number
    fileName?: string
  }
}

type ChatMessageBase = {
  id: string
  senderId: string
  senderName: string
  sentAt: number
}

export type ChatPlainTextMessage = ChatMessageBase & {
  type: "text"
} & ChatTextContent

export type ChatPlainImageMessage = ChatMessageBase & {
  type: "image"
} & ChatImageContent

export type ChatPlainMessage = ChatPlainTextMessage | ChatPlainImageMessage

export type ChatLocalImageExtras = {
  localObjectUrl?: string
  uploadStatus?: "pending" | "error"
}

export type ChatLocalMessage = ChatPlainMessage & ChatLocalImageExtras

export type ChatMessage = (ChatPlainMessage & {
  mine: boolean
}) & ChatLocalImageExtras

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
