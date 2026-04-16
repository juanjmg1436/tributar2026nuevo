'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SimuladorBanner } from '@/components/layout/SimuladorBanner'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { PageSpinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { useProgress } from '@/hooks/useProgress'
import { useNotifications } from '@/hooks/useNotifications'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const { user, profile, loading } = useUser()
  const { progress } = useProgress(user?.id ?? null)
  const { unreadCount } = useNotifications(user?.id ?? null)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return <PageSpinner />
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SimuladorBanner />
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        progress={progress}
        unreadCount={unreadCount}
      />
      <div className="lg:pl-72">
        <Header
          onOpenMobile={() => setMobileNavOpen(true)}
          progress={progress}
          userName={profile?.full_name}
          onSignOut={handleSignOut}
        />
        <main>{children}</main>
      </div>
      <MobileNav
        onOpenMenu={() => setMobileNavOpen(true)}
        onSignOut={handleSignOut}
      />
    </div>
  )
}
