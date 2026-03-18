import { memo } from 'react'
import type { Message } from '../../types/message'
import { formatMessageTime } from '../../shared/utils/formatDate'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar?: boolean
  senderName?: string
  currentUid: string
}

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'sending') return <span className="text-white/50 text-xs ml-1">○</span>
  if (status === 'sent') return <span className="text-white/60 text-xs ml-1">✓</span>
  if (status === 'delivered') return <span className="text-white/60 text-xs ml-1">✓✓</span>
  if (status === 'read') return <span className="text-blue-200 text-xs ml-1">✓✓</span>
  return null
}

const MessageBubble = ({
  message,
  isOwn,
  showAvatar = false,
  senderName,
  currentUid,
}: MessageBubbleProps) => {
  if (message.deleted_for.includes(currentUid)) return null

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2 px-4">
        <span className="text-xs italic text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  const timeStr = formatMessageTime(message.created_at)

  return (
    <div className={`flex mb-1 px-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && showAvatar && (
        <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0 mr-2 self-end" />
      )}

      <div
        className={`flex flex-col max-w-xs lg:max-w-md ${
          isOwn ? 'items-end' : 'items-start'
        }`}
      >
        {!isOwn && senderName && (
          <span className="text-xs text-slate-500 mb-0.5 ml-1">{senderName}</span>
        )}

        {message.is_deleted_for_all ? (
          <div
            className={`px-4 py-2 rounded-2xl text-sm italic ${
              isOwn
                ? 'bg-blue-400/50 text-blue-100 rounded-tr-sm'
                : 'bg-slate-100 text-slate-400 rounded-tl-sm'
            }`}
          >
            This message was deleted
          </div>
        ) : (
          <div
            className={`px-4 py-2 text-sm break-words leading-relaxed ${
              isOwn
                ? 'bg-blue-500 text-white rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
                : 'bg-slate-100 text-slate-900 rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl'
            }`}
          >
            {message.content}
          </div>
        )}

        {/* Timestamp + status row */}
        <div
          className={`flex items-center gap-0.5 mt-0.5 ${
            isOwn ? 'flex-row' : 'flex-row'
          }`}
        >
          <span className="text-[11px] text-slate-400">{timeStr}</span>
          {isOwn && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  )
}

export default memo(MessageBubble)