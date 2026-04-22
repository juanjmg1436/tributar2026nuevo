'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BookOpen, Eye, EyeOff, AlertCircle, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginForm() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (searchParams.get('error') === 'auth_callback_failed') {
      setError('El link de confirmación falló o ya fue usado. Intentá ingresar directamente.')
    }
  }, [searchParams])

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    try {
      setLoading(true)
      setError(null)
      setEmailNotConfirmed(false)
      setResendSuccess(false)

      // Login server-side: el servidor setea las cookies correctamente
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })

      const json = await res.json()

      if (!res.ok) {
        if (json.error === 'EMAIL_NOT_CONFIRMED') {
          setEmailNotConfirmed(true)
          setResendEmail(data.email)
        } else {
          setError(json.error ?? 'Error al ingresar. Intentá nuevamente.')
        }
        return
      }

      // Cookies seteadas por el servidor → navegar al dashboard
      window.location.replace('/dashboard')

    } catch (err) {
      console.error('LOGIN ERROR:', err)
      setError('Error de conexión. Verificá tu internet e intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendConfirmation() {
    try {
      setResendLoading(true)
      const supabase = createClient()
      const { error } = await supabase.auth.resend({ type: 'signup', email: resendEmail })
      if (error) {
        setError(`No se pudo reenviar el email: ${error.message}`)
      } else {
        setResendSuccess(true)
      }
    } catch {
      setError('Error al reenviar. Intentá nuevamente.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-primary-800 px-8 py-8 text-center">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Iniciar sesión</h1>
        <p className="text-primary-200 text-sm mt-1.5">Accedé a tu simulador educativo</p>
      </div>

      <div className="px-8 py-8">
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {emailNotConfirmed && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3 mb-3">
              <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Confirmá tu email primero</p>
                <p className="text-xs text-amber-700 mt-1">
                  Revisá tu bandeja de entrada para <strong>{resendEmail}</strong> y hacé clic en el link de confirmación.
                </p>
              </div>
            </div>
            {resendSuccess ? (
              <p className="text-xs text-emerald-700 font-medium text-center">✓ Email reenviado. Revisá tu bandeja.</p>
            ) : (
              <button type="button" onClick={handleResendConfirmation} disabled={resendLoading}
                className="w-full text-xs font-medium text-amber-800 underline hover:text-amber-900 disabled:opacity-50">
                {resendLoading ? 'Reenviando...' : 'Reenviar email de confirmación'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            {...register('email')}
            id="email" type="email" label="Email"
            placeholder="tu@email.com"
            error={errors.email?.message}
            required autoComplete="email"
          />

          <div className="relative">
            <Input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              label="Contraseña" placeholder="••••••••"
              error={errors.password?.message}
              required autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Ingresar al simulador
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-primary-700 font-semibold hover:underline">
              Registrate aquí
            </Link>
          </p>
        </div>

        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-xs text-amber-700 text-center font-medium">
            Simulador educativo · Datos ficticios · Sin validez legal
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <Suspense fallback={
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }>
        <LoginForm />
      </Suspense>
      <p className="text-center text-white/60 text-xs mt-4">
        TRIBUT.AR — Simulador Didáctico — No oficial
      </p>
    </div>
  )
}
