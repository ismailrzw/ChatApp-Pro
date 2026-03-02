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
}
