'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { PRACTICE_CASES } from '@/lib/constants/misiones'
import { formatCurrency } from '@/lib/utils'
import {
  BookOpen, CheckCircle2, Circle, ChevronDown, ChevronUp,
  AlertTriangle, Trophy, Target, Lightbulb, Star
} from 'lucide-react'
import type { ProvCaseProgress } from '@/types/provincial'

export default function CasosPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const [progress, setProgress] = useState<ProvCaseProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('prov_case_progress')
      .select('*')
      .eq('user_id', user!.id)
    setProgress(data || [])
    setLoading(false)
  }

  function getCaseProgress(caseId: string) {
    return progress.filter(p => p.case_id === caseId)
  }

  function isCaseCompleted(caseId: string) {
    const caseObj = PRACTICE_CASES.find(c => c.id === caseId)
    if (!caseObj) return false
    const prog = getCaseProgress(caseId)
    return prog.filter(p => p.completed).length >= caseObj.steps.length
  }

  function isStepCompleted(caseId: string, step: number) {
    return progress.some(p => p.case_id === caseId && p.step === step && p.completed)
  }

  async function completeStep(caseId: string, step: number) {
    if (!user) return
    setCompleting(`${caseId}-${step}`)
    const db = supabase as any

    const existing = progress.find(p => p.case_id === caseId && p.step === step)
    if (existing) {
      await db.from('prov_case_progress').update({ completed: true, completed_at: new Date().toISOString(), score: 100 }).eq('id', existing.id)
    } else {
      await db.from('prov_case_progress').insert({
        user_id: user.id,
        case_id: caseId,
        step,
        completed: true,
        score: 100,
        completed_at: new Date().toISOString(),
      })
    }
    await load()
    setCompleting(null)
  }

  const completedCases = PRACTICE_CASES.filter(c => isCaseCompleted(c.id)).length
  const difficultyColors: Record<string, string> = {
    'básico': 'bg-emerald-100 text-emerald-700',
    'intermedio': 'bg-amber-100 text-amber-700',
    'avanzado': 'bg-red-100 text-red-700',
  }

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Casos prácticos" subtitle="Ejercicios guiados de tributación provincial de Misiones">
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* Progress header */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-primary-700">{PRACTICE_CASES.length}</p>
          <p className="text-xs text-slate-500 mt-1">Casos disponibles</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{completedCases}</p>
          <p className="text-xs text-slate-500 mt-1">Completados</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-amber-600">{progress.filter(p => p.completed).length}</p>
          <p className="text-xs text-slate-500 mt-1">Pasos realizados</p>
        </Card>
      </div>

      {completedCases === PRACTICE_CASES.length && (
        <Alert variant="success" className="mb-5">
          <Trophy className="w-4 h-4 inline mr-1" />
          <strong>¡Excelente!</strong> Completaste todos los casos prácticos. Dominás el módulo ATM Misiones Simulado.
        </Alert>
      )}

      {/* Cases */}
      <div className="space-y-4">
        {PRACTICE_CASES.map((caso) => {
          const isExpanded = expanded === caso.id
          const completed = isCaseCompleted(caso.id)
          const caseProgress = getCaseProgress(caso.id)
          const completedSteps = caseProgress.filter(p => p.completed).length

          return (
            <Card key={caso.id} padding="none" className={`overflow-hidden border-2 ${completed ? 'border-emerald-300' : 'border-slate-200'}`}>
              {/* Header */}
              <div
                className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${completed ? 'bg-emerald-50/50' : ''}`}
                onClick={() => setExpanded(isExpanded ? null : caso.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${completed ? 'bg-emerald-100' : 'bg-primary-100'}`}>
                      {completed
                        ? <Trophy className="w-5 h-5 text-emerald-600" />
                        : <BookOpen className="w-5 h-5 text-primary-600" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800 text-sm">{caso.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[caso.difficulty]}`}>
                          {caso.difficulty}
                        </span>
                        {completed && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">✓ Completado</span>}
                      </div>
                      <p className="text-xs text-slate-500">{caso.subtitle}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 max-w-32">
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-600 rounded-full transition-all"
                              style={{ width: `${caso.steps.length > 0 ? (completedSteps / caso.steps.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">{completedSteps}/{caso.steps.length} pasos</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {/* Description */}
                  <div className="px-4 py-4 bg-slate-50/50 border-b border-slate-100">
                    <p className="text-sm text-slate-600">{caso.description}</p>
                  </div>

                  {/* Perfil del contribuyente */}
                  <div className="px-4 py-4 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Perfil del caso
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs">
                        <p className="text-slate-400 mb-0.5">Contribuyente</p>
                        <p className="font-medium text-slate-700">{caso.profile.name}</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs">
                        <p className="text-slate-400 mb-0.5">CUIT</p>
                        <p className="font-medium text-slate-700">{caso.profile.cuit}</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs">
                        <p className="text-slate-400 mb-0.5">Localidad</p>
                        <p className="font-medium text-slate-700">{caso.profile.locality}</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs">
                        <p className="text-slate-400 mb-0.5">Ingresos mensuales</p>
                        <p className="font-medium text-slate-700">{formatCurrency(caso.profile.monthlyRevenue)}</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs sm:col-span-2">
                        <p className="text-slate-400 mb-0.5">Actividad</p>
                        <p className="font-medium text-slate-700">{caso.profile.activity}</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs">
                        <p className="text-slate-400 mb-0.5">Alícuota IIBB</p>
                        <p className="font-medium text-slate-700">{(caso.profile.rate * 100).toFixed(1)}%</p>
                      </div>
                      <div className="bg-primary-50 border border-primary-200 rounded-lg p-2.5 text-xs">
                        <p className="text-primary-500 mb-0.5">Impuesto esperado</p>
                        <p className="font-bold text-primary-700">{formatCurrency(caso.expectedTax)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Objetivos */}
                  <div className="px-4 py-4 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Objetivos de aprendizaje</p>
                    <ul className="space-y-1.5">
                      {caso.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <Star className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pasos */}
                  <div className="px-4 py-4 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Pasos del caso</p>
                    <div className="space-y-2">
                      {caso.steps.map((step) => {
                        const done = isStepCompleted(caso.id, step.step)
                        const key = `${caso.id}-${step.step}`
                        return (
                          <div key={step.step} className={`flex items-start gap-3 p-3 rounded-lg border ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex-shrink-0 mt-0.5">
                              {done
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                : <Circle className="w-4 h-4 text-slate-300" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${done ? 'text-emerald-700' : 'text-slate-700'}`}>
                                Paso {step.step}: {step.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">{step.instruction}</p>
                            </div>
                            {!done && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => completeStep(caso.id, step.step)}
                                loading={completing === key}
                              >
                                Marcar hecho
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="px-4 py-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-amber-500" /> Tips y conceptos clave
                    </p>
                    <div className="space-y-2">
                      {caso.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <span className="text-amber-500 flex-shrink-0 text-xs font-bold mt-0.5">💡</span>
                          <p className="text-xs text-amber-800">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </PageContainer>
  )
}
