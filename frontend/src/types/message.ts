export type MessageType = 'text' | 'image' | 'file' | 'system'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'

export interface ReadReceipt {
  uid: string
  read_at: string
}

export interface Message {
  id: string // MongoDB _id as string (or temp_id while optimistic)
  conversation_id: string
  sender_uid: string
  type: MessageType
  content: string
  media_url: string | null
  reply_to_id: string | null
  reply_to?: Message | null
  status: MessageStatus
  read_by: ReadReceipt[]
  is_deleted_for_all: boolean
  deleted_for: string[]
  created_at: string // ISO datetime
  // Internal optimistic-UI marker — never comes from server
  _temp_id?: string
}

/** Shape sent over the WebSocket send_message event */
export interface SendMessagePayload {
  conversation_id: string
  type: MessageType
  content: string
  reply_to_id?: string | null
  temp_id: string
}

/** Shape received from the WebSocket message:receive event */
export interface MessageReceiveEvent {
  message: Message
}