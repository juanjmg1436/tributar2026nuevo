'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { BookOpen, Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

      const supabase = createClient()

      const { data: loginData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos. Verificá tus datos e intentá nuevamente.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!loginData.session) {
        setError('No se pudo crear la sesión. Intentá nuevamente.')
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      console.error('LOGIN ERROR:', err)
      setError('Ocurrió un error inesperado. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
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
            <Alert variant="error" className="mb-5" dismissible>
              {error}
            </Alert>
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

            <div>
              <div className="relative">
                <Input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Contraseña"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  required
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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

      <p className="text-center text-white/60 text-xs mt-4">
        TRIBUT.AR — Simulador Didáctico — No oficial
      </p>
    </div>
  )
}
