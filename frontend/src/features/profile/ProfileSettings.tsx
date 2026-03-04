import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../auth/authStore'
import { getMe, updateMe, uploadAvatar } from '../../shared/api/usersApi'
import Avatar from '../../shared/components/Avatar'
import { useToast } from '../../shared/components/Toast'
import ChatLayout from '../chat/ChatLayout'

export default function ProfileSettings() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()
  
  const [displayName, setDisplayName] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getMe()
        setDisplayName(profile.display_name)
        setStatusMessage(profile.status_message || '')
        setAvatarUrl(profile.avatar_url)
      } catch (err) {
        showToast('Failed to load profile', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showToast('File size exceeds 2MB', 'error')
      return
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      showToast('Only JPEG and PNG are allowed', 'error')
      return
    }

    setUploading(true)
    const previewUrl = URL.createObjectURL(file)
    const oldUrl = avatarUrl
    setAvatarUrl(previewUrl)

    try {
      const res = await uploadAvatar(file)
      setAvatarUrl(res.avatar_url)
      if (user) {
        setUser({ ...user, avatar_url: res.avatar_url })
      }
      showToast('Avatar updated', 'success')
    } catch (err) {
      setAvatarUrl(oldUrl)
      showToast('Failed to upload avatar', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) {
      showToast('Display name cannot be empty', 'error')
      return
    }

    setSaving(true)
    try {
      const updatedProfile = await updateMe({
        display_name: displayName,
        status_message: statusMessage
      })
      setUser(updatedProfile)
      showToast('Profile updated', 'success')
    } catch (err) {
      showToast('Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ChatLayout>
        <div className="h-full flex items-center justify-center bg-white">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </ChatLayout>
    )
  }

  return (
    <ChatLayout>
      <div className="max-w-3xl mx-auto py-8 md:py-12 px-4 md:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage your public profile and presence.</p>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row gap-10 items-start md:items-center mb-12">
              <div className="relative group">
                <Avatar 
                  src={avatarUrl} 
                  name={displayName} 
                  size="xl" 
                  className="shadow-2xl shadow-blue-100 ring-4 ring-white"
                />
                <button 
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 disabled:hidden"
                >
                  <svg className="w-8 h-8 text-white scale-90 group-hover:scale-100 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Profile Photo</h3>
                <p className="text-sm text-slate-500 mb-4 font-medium">Recommended: Square JPG or PNG, max 2MB.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={handleAvatarClick}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                  >
                    Upload New
                  </button>
                  {avatarUrl && (
                    <button 
                      onClick={() => setAvatarUrl(null)}
                      className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition-all active:scale-95"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/jpeg,image/png" 
              className="hidden" 
            />

            <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    required
                    disabled={saving}
                    className="block w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none disabled:opacity-60"
                    placeholder="Your display name"
                  />
                </div>

                <div className="space-y-2 opacity-60">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Email Address
                  </label>
                  <input
                    type="text"
                    value={user?.email || ''}
                    disabled
                    className="block w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Status Message
                  </label>
                  <span className="text-[10px] font-black text-slate-300">{statusMessage.length}/120</span>
                </div>
                <textarea
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  maxLength={120}
                  disabled={saving}
                  rows={3}
                  className="block w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none disabled:opacity-60 resize-none"
                  placeholder="What's on your mind?"
                />
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => navigate('/chat')}
                  className="px-8 py-4 text-sm font-black text-slate-400 hover:text-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center min-w-[160px]"
                >
                  {saving ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <ToastContainer />
    </ChatLayout>
  )
}
