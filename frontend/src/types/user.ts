export interface UserProfile {
  firebase_uid: string
  email: string
  display_name: string
  avatar_url: string | null
  status_message: string
  role: 'user' | 'admin'
  is_banned: boolean
  last_seen: string    // ISO datetime string
  visibility: { last_seen: 'everyone' | 'contacts' | 'nobody' }
  created_at: string
  // Sprint 2 additions:
  is_online?: boolean        // derived from Socket.IO presence events, not stored in DB
}

// For user search results
export interface UserSearchResult {
  firebase_uid: string
  display_name: string
  email: string
  avatar_url: string | null
  status_message: string
}
