'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { PRACTICE_CASES } from '@/lib/constants/misiones'
import { formatDate } from '@/lib/utils'
import {
  Users, FileText, TrendingUp, ShieldCheck, AlertTriangle,
  CheckCircle2, Clock, BookOpen, BarChart3
} from 'lucide-react'

interface StudentSummary {
  user_id: string
  full_name: string
  email: string
  has_taxpayer: boolean
  ddjj_count: number
  completed_cases: number
  last_activity: string | null
}

export default function AdminPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [globalStats, setGlobalStats] = useState({
    totalStudents: 0,
    withTaxpayer: 0,
    totalDDJJs: 0,
    totalCasesCompleted: 0,
    avgCasesPerStudent: 0,
  })

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const db = supabase as any
    try {
      // Fetch all profiles
      const { data: profiles } = await db.from('profiles').select('id, full_name, email').limit(100)
      const profileList = profiles || []

      if (profileList.length === 0) { setLoading(false); return }

      const userIds = profileList.map((p: any) => p.id)

      // Parallel queries
      const [taxpayersRes, ddjjsRes, caseProgressRes, activityRes] = await Promise.all([
        db.from('prov_taxpayers').select('user_id').in('user_id', userIds),
        db.from('prov_iibb_ddjj').select('user_id').in('user_id', userIds),
        db.from('prov_case_progress').select('user_id, case_id, completed').in('user_id', userIds),
        db.from('activity_log').select('user_id, created_at').in('user_id', userIds).order('created_at', { ascending: false }).limit(500),
      ])

      const taxpayerSet = new Set((taxpayersRes.data || []).map((t: any) => t.user_id))
      const ddjjCounts: Record<string, number> = {}
      for (const d of (ddjjsRes.data || [])) {
        ddjjCounts[d.user_id] = (ddjjCounts[d.user_id] || 0) + 1
      }
      const caseCounts: Record<string, Set<string>> = {}
      for (const c of (caseProgressRes.data || []).filter((c: any) => c.completed)) {
        if (!caseCounts[c.user_id]) caseCounts[c.user_id] = new Set()
        caseCounts[c.user_id].add(c.case_id)
      }
      const lastActivity: Record<string, string> = {}
      for (const a of (activityRes.data || [])) {
        if (!lastActivity[a.user_id]) lastActivity[a.user_id] = a.created_at
      }

      const summaries: StudentSummary[] = profileList.map((p: any) => ({
        user_id: p.id,
        full_name: p.full_name || 'Sin nombre',
        email: p.email || '',
        has_taxpayer: taxpayerSet.has(p.id),
        ddjj_count: ddjjCounts[p.id] || 0,
        completed_cases: caseCounts[p.id]?.size || 0,
        last_activity: lastActivity[p.id] || null,
      }))

      setStudents(summaries)

      const withTaxpayer = summaries.filter(s => s.has_taxpayer).length
      const totalDDJJs = summaries.reduce((s, st) => s + st.ddjj_count, 0)
      const totalCasesCompleted = summaries.reduce((s, st) => s + st.completed_cases, 0)

      setGlobalStats({
        totalStudents: summaries.length,
        withTaxpayer,
        totalDDJJs,
        totalCasesCompleted,
        avgCasesPerStudent: summaries.length > 0 ? Math.round((totalCasesCompleted / summaries.length) * 10) / 10 : 0,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  const maxDDJJs = Math.max(...students.map(s => s.ddjj_count), 1)

  return (
    <PageContainer title="Panel docente — ATM Misiones" subtitle="Seguimiento del progreso de estudiantes (datos de esta plataforma)">
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card padding="sm" className="text-center">
          <div className="flex justify-center mb-1"><Users className="w-5 h-5 text-primary-500" /></div>
          <p className="text-2xl font-bold text-primary-700">{globalStats.totalStudents}</p>
          <p className="text-xs text-slate-500 mt-1">Estudiantes</p>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="flex justify-center mb-1"><ShieldCheck className="w-5 h-5 text-emerald-500" /></div>
          <p className="text-2xl font-bold text-emerald-600">{globalStats.withTaxpayer}</p>
          <p className="text-xs text-slate-500 mt-1">Con alta provincial</p>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="flex justify-center mb-1"><FileText className="w-5 h-5 text-blue-500" /></div>
          <p className="text-2xl font-bold text-blue-600">{globalStats.totalDDJJs}</p>
          <p className="text-xs text-slate-500 mt-1">DDJJ presentadas</p>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="flex justify-center mb-1"><BookOpen className="w-5 h-5 text-amber-500" /></div>
          <p className="text-2xl font-bold text-amber-600">{globalStats.avgCasesPerStudent}</p>
          <p className="text-xs text-slate-500 mt-1">Casos completados (prom.)</p>
        </Card>
      </div>

      {/* Casos prácticos overview */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-slate-700 text-sm">Casos prácticos — resumen</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRACTICE_CASES.map(caso => {
            const completers = students.filter(s => s.completed_cases > 0).length
            return (
              <div key={caso.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 mb-1">{caso.title}</p>
                <p className="text-xs text-slate-400 mb-2">{caso.difficulty}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: globalStats.totalStudents > 0 ? `${(completers / globalStats.totalStudents) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-8 text-right">{completers}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">estudiantes completaron</p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Students table */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm">Detalle por estudiante</h3>
        </div>
        {students.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Sin estudiantes registrados aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs text-slate-400 px-4 py-2.5 font-semibold">Estudiante</th>
                  <th className="text-center text-xs text-slate-400 px-3 py-2.5 font-semibold">Alta prov.</th>
                  <th className="text-center text-xs text-slate-400 px-3 py-2.5 font-semibold">DDJJ</th>
                  <th className="text-center text-xs text-slate-400 px-3 py-2.5 font-semibold hidden sm:table-cell">Actividad DDJJ</th>
                  <th className="text-center text-xs text-slate-400 px-3 py-2.5 font-semibold">Casos</th>
                  <th className="text-right text-xs text-slate-400 px-4 py-2.5 font-semibold hidden md:table-cell">Última actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map(s => (
                  <tr key={s.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-sm">{s.full_name}</p>
                      <p className="text-xs text-slate-400 truncate max-w-40">{s.email}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {s.has_taxpayer
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                        : <Clock className="w-4 h-4 text-slate-300 mx-auto" />
                      }
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-sm font-bold ${s.ddjj_count > 0 ? 'text-primary-700' : 'text-slate-400'}`}>
                        {s.ddjj_count}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${Math.min((s.ddjj_count / maxDDJJs) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`text-sm font-bold ${s.completed_cases >= PRACTICE_CASES.length ? 'text-emerald-600' : s.completed_cases > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {s.completed_cases}/{PRACTICE_CASES.length}
                        </span>
                        {s.completed_cases >= PRACTICE_CASES.length && <span className="text-xs">🏆</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <p className="text-xs text-slate-400">
                        {s.last_activity ? formatDate(s.last_activity) : 'Sin actividad'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Educational note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-700">
          <strong>💡 Uso docente:</strong> Este panel muestra el progreso de todos los usuarios registrados en la plataforma.
          Sirve para hacer un seguimiento pedagógico de la actividad en el módulo ATM Misiones Simulado:
          quiénes completaron el alta, cuántas DDJJ presentaron y cuáles casos prácticos resolvieron.
          No muestra datos fiscales reales.
        </p>
      </div>
    </PageContainer>
  )
}
