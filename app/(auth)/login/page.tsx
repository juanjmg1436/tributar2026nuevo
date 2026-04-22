'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BookOpen, Eye, EyeOff, AlertCircle, Mail } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

function translateAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Email o contraseña incorrectos. Verificá tus datos e intentá nuevamente.'
  }
  if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'EMAIL_NOT_CONFIRMED'
  }
  if (msg.includes('Too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.'
  }
  if (msg.includes('User not found')) {
    return 'No existe una cuenta con ese email. ¿Querés registrarte?'
  }
  if (msg.includes('Network') || msg.includes('fetch')) {
    return 'Error de conexión. Verificá tu internet e intentá nuevamente.'
  }
  return `Error: ${msg}`
}

// Componente interno que usa useSearchParams — debe estar dentro de <Suspense>
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
      setError('El link de confirmación falló o ya fue usado. Intentá ingresar directamente o registrate de nuevo.')
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    try {
      setLoading(true)
      setError(null)
      setEmailNotConfirmed(false)
      setResendSuccess(false)

      const supabase = createClient()

      const { data: loginData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        console.error('AUTH ERROR:', authError.message, authError)
        const translated = translateAuthError(authError.message)
        if (translated === 'EMAIL_NOT_CONFIRMED') {
          setEmailNotConfirmed(true)
          setResendEmail(data.email)
        } else {
          setError(translated)
        }
        return
      }

      if (!loginData.session) {
        setError('No se pudo crear la sesión. Intentá nuevamente.')
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      console.error('LOGIN EXCEPTION:', err)
      setError('Ocurrió un error inesperado. Revisá la consola del navegador (F12) para más detalles.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendConfirmation() {
    try {
      setResendLoading(true)
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
      })
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
        {/* Error general — sin botón de cierre */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Email no confirmado */}
        {emailNotConfirmed && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3 mb-3">
              <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Confirmá tu email primero</p>
                <p className="text-xs text-amber-700 mt-1">
                  Enviamos un link de confirmación a <strong>{resendEmail}</strong>. Revisá tu
                  bandeja de entrada (y carpeta de spam) y hacé clic en el link antes de ingresar.
                </p>
              </div>
            </div>
            {resendSuccess ? (
              <p className="text-xs text-emerald-700 font-medium text-center">
                ✓ Email de confirmación reenviado. Revisá tu bandeja.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="w-full text-xs font-medium text-amber-800 underline hover:text-amber-900 disabled:opacity-50"
              >
                {resendLoading ? 'Reenviando...' : 'Reenviar email de confirmación'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            {...register('email')}
            id="email"
            type="email"
            label="Email"
            placeholder="tu@email.com"
            error={errors.email?.message}
            required
            autoComplete="email"
          />

          <div className="relative">
            <Input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              label="Contraseña"
              placeholder="••••••••"
              error={errors.password?.message}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
            >
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
            Este es un simulador educativo. Los datos son ficticios y no tienen validez legal.
          </p>
        </div>
      </div>
    </div>
  )
}

// Página principal con Suspense requerido por useSearchParams en Next.js 14
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
