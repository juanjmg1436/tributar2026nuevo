import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, pattern, { locale: es })
  } catch {
    return 'Fecha inválida'
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function generateDemoCUIT(subjectType: 'persona_humana' | 'persona_juridica'): string {
  const prefix = subjectType === 'persona_humana' ? '20' : '30'
  const middle = Math.floor(Math.random() * 90000000 + 10000000)
  const raw = `${prefix}${middle}`
  const checkDigit = calculateCUITVerifier(raw)
  return `${prefix}-${middle}-${checkDigit}`
}

function calculateCUITVerifier(cuit: string): number {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const digits = cuit.split('').map(Number)
  const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0)
  const remainder = sum % 11
  return remainder === 0 ? 0 : 11 - remainder
}

export function formatCUIT(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10, 11)}`
}

export function getProgressLabel(percentage: number): string {
  if (percentage === 0) return 'Sin iniciar'
  if (percentage < 25) return 'Iniciado'
  if (percentage < 50) return 'En progreso'
  if (percentage < 75) return 'Avanzado'
  if (percentage < 100) return 'Casi completo'
  return 'Completado'
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Hace un momento'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours} h`
  if (diffDays < 7) return `Hace ${diffDays} días`
  return formatDate(d)
}
