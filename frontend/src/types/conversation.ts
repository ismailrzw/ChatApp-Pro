export type ConversationType = 'direct' | 'group'

export interface LastMessage {
  text: string
  sender_uid: string
  sent_at: string // ISO datetime
}

export interface OtherUser {
  firebase_uid: string
  display_name: string
  avatar_url: string | null
}

export interface Conversation {
  id: string // MongoDB _id as string
  type: ConversationType
  participants: string[] // array of firebase_uid
  group_name: string | null
  group_avatar: string | null
  admin_uids: string[] | null
  last_message: LastMessage | null
  other_user: OtherUser | null // enriched by backend for DMs
  created_at: string
  updated_at: string
  // Derived on frontend — not stored in DB:
  display_name?: string
  display_avatar?: string
  unread_count?: number
}

export interface CreateConversationPayload {
  type: ConversationType
  participant_uid: string
  group_name?: string
  participant_uids?: string[]
}