import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Bell, Info, TriangleAlert, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Notification } from '@/types'

interface NotificationCardProps {
  notification: Notification
  onMarkRead?: (id: string) => void
}

export function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const icons = {
    info: <Info className="w-4 h-4 text-blue-500" />,
    warning: <TriangleAlert className="w-4 h-4 text-amber-500" />,
    reminder: <Bell className="w-4 h-4 text-orange-500" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
  }

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-slate-50',
        !notification.is_read && 'bg-blue-50/60'
      )}
      onClick={() => onMarkRead?.(notification.id)}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[notification.notification_type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-slate-800', !notification.is_read && 'font-semibold')}>
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-slate-400 mt-1">{formatDate(notification.created_at, 'dd/MM/yyyy HH:mm')}</p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
      )}
    </div>
  )
}
