'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { BookOpen, CheckCircle2, Eye, EyeOff } from 'lucide-react'

const registerSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
  institution: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterForm) {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            institution: data.institution || null,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/dashboard`,
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Este email ya está registrado. Intentá iniciar sesión.')
        } else {
          setError(signUpError.message)
        }
        return
      }

      setSuccess(true)
    } catch {
      setError('Ocurrió un error al registrarte. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">¡Registro exitoso!</h2>
          <p className="text-slate-600 text-sm mb-6">
            Revisá tu correo electrónico para confirmar tu cuenta y luego podrás ingresar al simulador.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Si no ves el email, revisá la carpeta de spam o correo no deseado.
          </p>
          <Link href="/login">
            <Button variant="primary" className="w-full">
              Ir a iniciar sesión
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary-800 px-8 py-8 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
          <p className="text-primary-200 text-sm mt-1.5">Comenzá a usar el simulador educativo</p>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          {error && (
            <Alert variant="error" className="mb-5" dismissible>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              {...register('fullName')}
              id="fullName"
              label="Nombre y apellido"
              placeholder="Ej: Juan García"
              error={errors.fullName?.message}
              required
            />
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
            <Input
              {...register('institution')}
              id="institution"
              label="Institución o curso (opcional)"
              placeholder="Ej: Instituto Nacional de Comercio"
              helpText="Nombre de tu escuela, instituto o curso"
            />
            <div className="relative">
              <Input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Contraseña"
                placeholder="Mínimo 8 caracteres"
                error={errors.password?.message}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Input
              {...register('confirmPassword')}
              id="confirmPassword"
              type="password"
              label="Confirmar contraseña"
              placeholder="Repetí tu contraseña"
              error={errors.confirmPassword?.message}
              required
              autoComplete="new-password"
            />

            <div className="pt-1">
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Crear mi cuenta
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              ¿Ya tenés cuenta?{' '}
              <Link href="/login" className="text-primary-700 font-semibold hover:underline">
                Iniciá sesión aquí
              </Link>
            </p>
          </div>

          <div className="mt-5 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs text-amber-700 text-center">
              🎓 Simulador educativo. Datos ficticios. Sin validez legal.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
