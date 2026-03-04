import axiosInstance from './axiosInstance'
import type { Contact, ContactRequest, UpdateContactPayload } from '../../types/contact'

/**
 * Fetch all accepted contacts.
 */
export async function getContacts(): Promise<Contact[]> {
  const res = await axiosInstance.get<Contact[]>('/api/contacts')
  return res.data
}

/**
 * Send a new contact request.
 */
export async function sendContactRequest(payload: ContactRequest): Promise<Contact> {
  const res = await axiosInstance.post<Contact>('/api/contacts/request', payload)
  return res.data
}

/**
 * Update contact status (accept or block).
 */
export async function updateContact(
  contactId: string,
  payload: UpdateContactPayload
): Promise<Contact> {
  const res = await axiosInstance.put<Contact>(`/api/contacts/${contactId}`, payload)
  return res.data
}

/**
 * Remove a contact or cancel a request.
 */
export async function deleteContact(contactId: string): Promise<void> {
  await axiosInstance.delete(`/api/contacts/${contactId}`)
}
