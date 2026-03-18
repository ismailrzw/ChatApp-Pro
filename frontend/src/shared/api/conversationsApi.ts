import axiosInstance from './axiosInstance'
import type { Conversation, CreateConversationPayload } from '../../types/conversation'

/** Create or retrieve an existing DM conversation. Idempotent. */
export async function createConversation(
  payload: CreateConversationPayload
): Promise<Conversation> {
  const res = await axiosInstance.post<Conversation>('/api/conversations', payload)
  return res.data
}

/** Fetch all conversations for the authenticated user, sorted newest-first. */
export async function getConversations(): Promise<Conversation[]> {
  const res = await axiosInstance.get<Conversation[]>('/api/conversations')
  return res.data
}