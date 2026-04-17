'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user, profile, loading, error } = useUser()
  const { progress } = useProgress(user?.id ?? null)
  const { unreadCount } = useNotifications(user?.id ?? null)
  const didRedirect = useRef(false)

  useEffect(() => {
    // Redirigir solo si: carga terminó, no hay usuario, sin error de red
    if (!loading && !user && !error && !didRedirect.current) {
      didRedirect.current = true
      window.location.href = '/login'
    }
  }, [user, loading, error])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <PageSpinner />
  if (!user) return null

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
        <main>
          {error && (
            <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              ⚠️ {error} — Podés continuar navegando.
            </div>
          )}
          {children}
        </main>
      </div>
      <MobileNav
        onOpenMenu={() => setMobileNavOpen(true)}
        onSignOut={handleSignOut}
      />
    </div>
  )
}
