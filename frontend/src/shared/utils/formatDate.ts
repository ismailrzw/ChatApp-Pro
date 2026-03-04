export function formatLastSeen(lastSeen: string | null | undefined, isOnline: boolean): string {
  if (isOnline) return 'Online'
  if (!lastSeen) return 'Never seen'
  
  try {
    const date = new Date(lastSeen)
    if (isNaN(date.getTime())) return 'Never seen'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1)  return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24)  return `${diffHrs}h ago`
    
    return date.toLocaleDateString()
  } catch (e) {
    return 'Never seen'
  }
}
