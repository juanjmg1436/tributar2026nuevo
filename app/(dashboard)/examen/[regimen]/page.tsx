'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { PageContainer } from '@/components/layout/PageContainer'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import {
  getExamenByRegimen, EXAM_STORAGE_KEY,
  type ExamDef, type ExamResult,
} from '@/lib/constants/examenes'
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, AlertTriangle, Trophy } from 'lucide-react'

// ── Componente principal ──────────────────────────────────────
export default function ExamenPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()

  const regime = (params?.regimen as string)?.toUpperCase().replace('-', '_')
  const exam = getExamenByRegimen(regime)

  // Orden aleatorio de preguntas (una sola vez)
  const [order] = useState<number[]>(() =>
    exam ? shuffle(exam.questions.map((_, i) => i)) : []
  )

  const [current, setCurrent] = useState(0)       // índice de la pregunta en pantalla
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    exam ? Array(exam.questions.length).fill(null) : []
  )
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(exam?.durationSeconds ?? 900)
  const [alreadyPassed, setAlreadyPassed] = useState<ExamResult | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Revisar si ya aprobó
  useEffect(() => {
    if (!user || !exam) return
    const key = EXAM_STORAGE_KEY(user.id, regime)
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const result: ExamResult = JSON.parse(stored)
        if (result.passed) setAlreadyPassed(result)
      } catch { /* ignore */ }
    }
  }, [user, regime])

  // Temporizador
  useEffect(() => {
    if (submitted) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          handleSubmit(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [submitted])

  if (!exam) {
    return (
      <PageContainer title="Examen no encontrado">
        <p className="text-slate-500">No hay examen para el régimen: {regime}</p>
        <Link href="/dashboard" className="text-primary-600 hover:underline mt-4 inline-block">← Volver al panel</Link>
      </PageContainer>
    )
  }

  if (!user) return <PageContainer><div className="flex justify-center py-20"><Spinner /></div></PageContainer>

  const questions = order.map(i => exam.questions[i])
  const q = questions[current]
  const progress = ((current + 1) / questions.length) * 100

  function handleAnswer(optionIdx: number) {
    if (submitted) return
    setAnswers(prev => {
      const next = [...prev]
      next[current] = optionIdx
      return next
    })
  }

  function handleSubmit(forced = false) {
    if (submitted) return
    if (timerRef.current) clearInterval(timerRef.current)

    const correctCount = questions.reduce((acc, q, i) => {
      const originalIdx = order[i]
      return acc + (answers[i] === q.correctIndex ? 1 : 0)
    }, 0)
    const score = Math.round((correctCount / questions.length) * 100)
    const passed = score >= exam.passingScore

    const result: ExamResult = {
      userId: user!.id,
      regime,
      score,
      correctCount,
      totalQuestions: questions.length,
      passed,
      answers: answers.map(a => a ?? -1),
      completedAt: new Date().toISOString(),
      xpAwarded: passed ? exam.xpReward : 0,
    }

    localStorage.setItem(EXAM_STORAGE_KEY(user!.id, regime), JSON.stringify(result))
    localStorage.setItem(
      EXAM_STORAGE_KEY(user!.id, regime) + '_answers_order',
      JSON.stringify(order)
    )

    setSubmitted(true)
    // Navegar al resultado
    router.push(`/examen/${params.regimen}/resultado`)
  }

  const answeredCount = answers.filter(a => a !== null).length
  const allAnswered = answeredCount === questions.length
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timerCritical = timeLeft < 120

  // ── UI del examen ─────────────────────────────────────────
  return (
    <PageContainer
      title={exam.title}
      subtitle={exam.subtitle}
    >
      {/* Banner si ya aprobó antes */}
      {alreadyPassed && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <Trophy className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Ya aprobaste este examen ({alreadyPassed.score}%)</p>
            <p className="text-xs text-emerald-600">Podés realizarlo de nuevo para practicar, pero el XP ya fue otorgado.</p>
          </div>
          <Link href={`/examen/${params.regimen}/resultado`} className="ml-auto text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap">Ver resultado →</Link>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header con timer + progreso */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500">Pregunta {current + 1} de {questions.length}</span>
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold', timerCritical ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700')}>
              <Clock className="w-3.5 h-3.5" />
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
          </div>

          {/* Barra de progreso de preguntas */}
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'flex-1 h-2 rounded-full transition-all',
                  i === current ? 'bg-primary-600'
                  : answers[i] !== null ? 'bg-emerald-400'
                  : 'bg-slate-200 hover:bg-slate-300'
                )}
                title={`Pregunta ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{answeredCount}/{questions.length} respondidas</span>
            {!allAnswered && <span>{questions.length - answeredCount} pendientes</span>}
            {allAnswered && <span className="text-emerald-600 font-semibold">¡Todas respondidas!</span>}
          </div>
        </div>

        {/* Tarjeta de pregunta */}
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm mb-6">
          {/* Categoría */}
          <div className="px-6 pt-4 pb-2">
            <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">
              {CATEGORY_LABELS[q.category]}
            </span>
          </div>

          {/* Pregunta */}
          <div className="px-6 pb-5">
            <p className="text-base font-semibold text-slate-800 leading-relaxed mb-5">
              {q.question}
            </p>

            {/* Opciones */}
            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                const selected = answers[current] === idx
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm flex items-center gap-3',
                      selected
                        ? 'border-primary-500 bg-primary-50 text-primary-800 font-medium'
                        : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <span className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                      selected ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-300 text-slate-500'
                    )}>
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Navegación */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent(current + 1)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={!allAnswered}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all',
                allAnswered
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              {allAnswered ? 'Finalizar examen' : `Faltan ${questions.length - answeredCount} respuestas`}
            </button>
          )}
        </div>

        {/* Alerta tiempo crítico */}
        {timerCritical && !submitted && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-700 font-medium">¡Menos de 2 minutos! El examen se entregará automáticamente al agotarse el tiempo.</p>
          </div>
        )}
      </div>
    </PageContainer>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const CATEGORY_LABELS: Record<string, string> = {
  conceptos: 'Conceptos fundamentales',
  obligaciones: 'Obligaciones tributarias',
  comprobantes: 'Comprobantes y facturación',
  plazos: 'Plazos y vencimientos',
  calculo: 'Cálculo impositivo',
}
