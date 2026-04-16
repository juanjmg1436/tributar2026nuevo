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

  if (loading) return <PageSpinner />
  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <SimuladorBanner />
      <Sidebar
        progress={progress}
        onSignOut={handleSignOut}
        userName={profile?.full_name}
      />
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        progress={progress}
        userName={profile?.full_name}
        onSignOut={handleSignOut}
      />
      <div className="lg:pl-64">
        <Header
          userName={profile?.full_name}
          unreadNotifications={unreadCount}
          onMenuToggle={() => setMobileNavOpen(true)}
          onSignOut={handleSignOut}
        />
        <main className="min-h-[calc(100vh-100px)]">
          {children}
        </main>
        <footer className="px-4 lg:px-6 py-4 border-t border-slate-200 bg-white">
          <p className="text-xs text-slate-400 text-center">
            TRIBUT.AR — Simulador Didáctico Fiscal Argentino — NO OFICIAL — SIN VALIDEZ LEGAL/FISCAL — DATOS DEMO
          </p>
        </footer>
      </div>
    </div>
  )
}
