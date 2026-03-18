import axiosInstance from './axiosInstance'
import type { Message } from '../../types/message'

export interface GetMessagesResponse {
  messages: Message[]
  has_more: boolean
  next_cursor: string | null
}

/** Fetch a page of messages for a conversation, optionally paginated by cursor. */
export async function getMessages(
  conversationId: string,
  beforeId?: string | null
): Promise<GetMessagesResponse> {
  const params: Record<string, string> = {}
  if (beforeId) params.before_id = beforeId
  const res = await axiosInstance.get<GetMessagesResponse>(
    `/api/conversations/${conversationId}/messages`,
    { params }
  )
  return res.data
}