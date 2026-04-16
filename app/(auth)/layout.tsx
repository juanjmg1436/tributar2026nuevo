import { SimuladorBanner } from '@/components/layout/SimuladorBanner'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      <SimuladorBanner />
      <div className="flex items-center justify-center min-h-[calc(100vh-42px)] px-4 py-8">
        {children}
      </div>
    </div>
  )
}
