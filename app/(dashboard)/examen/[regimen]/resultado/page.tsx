'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { PageContainer } from '@/components/layout/PageContainer'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import {
  getExamenByRegimen, EXAM_STORAGE_KEY,
  type ExamResult,
} from '@/lib/constants/examenes'
import { CheckCircle2, XCircle, Trophy, Zap, RotateCcw, ArrowLeft, Star, ChevronDown, ChevronUp } from 'lucide-react'

export default function ResultadoExamenPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()

  const regime = (params?.regimen as string)?.toUpperCase().replace('-', '_')
  const exam = getExamenByRegimen(regime)
  const [result, setResult] = useState<ExamResult | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    const key = EXAM_STORAGE_KEY(user.id, regime)
    const stored = localStorage.getItem(key)
    const storedOrder = localStorage.getItem(key + '_answers_order')
    if (stored) {
      try { setResult(JSON.parse(stored)) } catch { /* ignore */ }
    } else {
      router.replace(`/examen/${params.regimen}`)
    }
    if (storedOrder) {
      try { setOrder(JSON.parse(storedOrder)) } catch { /* ignore */ }
    }
  }, [user, regime])

  if (!user || !exam) return <PageContainer><div className="flex justify-center py-20"><Spinner /></div></PageContainer>
  if (!result) return <PageContainer><div className="flex justify-center py-20"><Spinner /></div></PageContainer>

  const questions = order.length > 0 ? order.map(i => exam.questions[i]) : exam.questions
  const isPassed = result.passed
  const retryHref = `/examen/${params.regimen}`
  const backHref = regime === 'MONOTRIBUTO' ? '/monotributo' : '/iva'

  const CIRCLE_R = 46
  const CIRCLE_CIRCUM = 2 * Math.PI * CIRCLE_R
  const scoreDash = CIRCLE_CIRCUM * (result.score / 100)

  return (
    <PageContainer
      title={isPassed ? '¡Examen aprobado!' : 'Examen no aprobado'}
      subtitle={exam.title}
    >
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Resultado principal ───────────────────────────── */}
        <div className={cn(
          'rounded-2xl border-2 p-6 text-center',
          isPassed ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'
        )}>
          {/* Score circular */}
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r={CIRCLE_R} fill="none" strokeWidth="8" stroke="#e2e8f0" />
                <circle
                  cx="55" cy="55" r={CIRCLE_R}
                  fill="none" strokeWidth="8"
                  stroke={isPassed ? '#10b981' : '#f59e0b'}
                  strokeLinecap="round"
                  strokeDasharray={`${scoreDash} ${CIRCLE_CIRCUM}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isPassed
                  ? <Trophy className="w-5 h-5 text-emerald-600 mb-0.5" />
                  : <XCircle className="w-5 h-5 text-amber-600 mb-0.5" />
                }
                <span className="text-2xl font-black text-slate-800">{result.score}%</span>
              </div>
            </div>
          </div>

          <h2 className={cn('text-xl font-black mb-1', isPassed ? 'text-emerald-800' : 'text-amber-800')}>
            {isPassed ? `¡Aprobado con ${result.score}%!` : `No aprobado — ${result.score}%`}
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            {result.correctCount} respuestas correctas de {result.totalQuestions}
            {' · '} Mínimo para aprobar: {exam.passingScore}%
          </p>

          {isPassed && (
            <div className="inline-flex items-center gap-2 bg-white border border-emerald-200 px-5 py-2.5 rounded-full shadow-sm">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-black text-slate-800">+{result.xpAwarded} XP</span>
              <span className="text-xs text-slate-500">ganados</span>
            </div>
          )}

          {!isPassed && (
            <p className="text-xs text-amber-700 mt-2">
              Revisá las respuestas incorrectas a continuación y volvé a intentarlo. No hay límite de intentos.
            </p>
          )}
        </div>

        {/* ── Botones de acción ─────────────────────────────── */}
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            href={retryHref}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Volver a intentar
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary-700 text-white rounded-xl hover:bg-primary-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al panel
          </Link>
        </div>

        {/* ── Desglose de respuestas ────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Revisión detallada</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> {result.correctCount} correctas</span>
              <span className="flex items-center gap-1 text-red-600"><XCircle className="w-3.5 h-3.5" /> {result.totalQuestions - result.correctCount} incorrectas</span>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {questions.map((q, i) => {
              const selected = result.answers[i]
              const isCorrect = selected === q.correctIndex
              const isExpanded = expandedIdx === i

              return (
                <div key={q.id} className={cn('transition-colors', isCorrect ? 'hover:bg-emerald-50/50' : 'hover:bg-red-50/50')}>
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    className="w-full text-left px-5 py-3.5 flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {isCorrect
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <XCircle className="w-5 h-5 text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">Pregunta {i + 1}</p>
                      <p className="text-sm text-slate-700 leading-snug">{q.question}</p>
                      {!isCorrect && selected >= 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Tu respuesta: <span className="font-semibold">{q.options[selected]}</span>
                        </p>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                    }
                  </button>

                  {/* Explicación expandida */}
                  {isExpanded && (
                    <div className={cn('px-5 pb-4 ml-8 space-y-2')}>
                      <div className={cn('flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold', isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800')}>
                        {isCorrect
                          ? <><CheckCircle2 className="w-3.5 h-3.5" /> Respuesta correcta: {q.options[q.correctIndex]}</>
                          : <><XCircle className="w-3.5 h-3.5" /> Respuesta correcta: {q.options[q.correctIndex]}</>
                        }
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Explicación</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{q.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Motivación si reprobó */}
        {!isPassed && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-bold text-blue-800">Consejos para el próximo intento</p>
            </div>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Leé las explicaciones de las preguntas incorrectas antes de reintentar</li>
              <li>Repasá el módulo del régimen desde el Administrador de Relaciones</li>
              <li>Necesitás un mínimo de {exam.passingScore}% ({Math.ceil(exam.passingScore / 10)} de 10 correctas) para aprobar</li>
              <li>No hay penalidad por repetir el examen</li>
            </ul>
          </div>
        )}

      </div>
    </PageContainer>
  )
}
