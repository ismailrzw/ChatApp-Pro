export type ContactStatus = 'pending' | 'accepted' | 'blocked'

export interface Contact {
  contact_id: string         // Added this to match backend task B5/B7 spec
  requester_uid: string
  addressee_uid: string
  status: ContactStatus
  created_at: string         // ISO datetime
  updated_at: string         // ISO datetime
  // Populated/enriched on the frontend after fetching:
  other_user?: UserProfile   // the user who is NOT the current user
}

import { UserProfile } from './user'

export interface ContactRequest {
  addressee_uid: string
}

export interface UpdateContactPayload {
  status: 'accepted' | 'blocked'
}
