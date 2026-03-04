import React from 'react'

interface AvatarProps {
  src?: string | null
  name: string           // used to generate initials fallback
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isOnline?: boolean     // shows green dot indicator if true
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

const colors = [
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
]

const getInitials = (name: string) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const getColorClass = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', isOnline, className = '' }) => {
  const [error, setError] = React.useState(false)
  const initials = getInitials(name)
  const colorClass = getColorClass(name)
  const sizeClass = sizeClasses[size]

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      {src && !error ? (
        <img
          src={src}
          alt={name}
          onError={() => setError(true)}
          className={`${sizeClass} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold ${colorClass}`}>
          {initials}
        </div>
      )}
      {isOnline && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
      )}
    </div>
  )
}

export default React.memo(Avatar)
