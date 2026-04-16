'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchNotifications() {
    if (!userId) return
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.is_read).length)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    await fetchNotifications()
  }

  async function markAllAsRead() {
    if (!userId) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    await fetchNotifications()
  }

  useEffect(() => {
    fetchNotifications()
  }, [userId])

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetchNotifications }
}
