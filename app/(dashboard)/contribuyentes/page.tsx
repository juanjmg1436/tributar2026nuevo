'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useUser } from '@/hooks/useUser'
import {
  User, Building2, CheckCircle2, Clock, Plus, Pencil,
  ArrowRight, Check, X, Info
} from 'lucide-react'
import type { TaxpayerProfile } from '@/types'

export default function ContribuyentesPage() {
  const router = useRouter()
  const { user, taxpayerProfile, allTaxpayerProfiles, setActiveTaxpayer, refresh, loading } = useUser()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAlias, setEditAlias] = useState('')
  const [savingAlias, setSavingAlias] = useState(false)
  const [creating, setCreating] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const canCreate = allTaxpayerProfiles.length < 2

  async function handleSwitch(id: string) {
    if (id === taxpayerProfile?.id) return
    setSwitching(id)
    await setActiveTaxpayer(id)
    setSwitching(null)
    router.push('/dashboard')
  }

  function startEdit(tp: TaxpayerProfile) {
    setEditingId(tp.id)
    setEditAlias((tp as any).alias ?? tp.entity_name)
  }

  async function saveAlias(id: string) {
    if (!editAlias.trim()) return
    setSavingAlias(true)
    await supabase.from('taxpayer_profiles').update({ alias: editAlias.trim() } as any).eq('id', id)
    await refresh()
    setEditingId(null)
    setSavingAlias(false)
  }

  async function handleCreate() {
    if (!user || !canCreate) return
    setCreating(true)
    setError(null)
    const { error: err } = await supabase.from('taxpayer_profiles').insert({
      user_id: user.id,
      slot: 2,
      alias: 'Empresa (Slot 2)',
      is_active: false,
      entity_name: 'Mi Empresa S.R.L.',
      subject_type: 'persona_juridica',
      cuit: '30-00000002-0',
      status: 'incomplete',
    } as any)
    if (err) setError(err.message)
    else await refresh()
    setCreating(false)
  }

  if (loading) return <PageContainer title="Mis contribuyentes"><div className="py-20 text-center text-slate-400">Cargando...</div></PageContainer>

  return (
    <PageContainer
      title="Mis contribuyentes"
      subtitle="Administrá tus perfiles de contribuyentes simulados. Podés tener hasta 2 para practicar diferentes regímenes."
    >
      <Alert variant="info" className="mb-6">
        <div className="flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>¿Para qué sirven los dos contribuyentes?</strong> El simulador te permite practicar con dos situaciones fiscales distintas. Por ejemplo: un slot como <strong>Persona Humana Monotributista</strong> y otro como <strong>Empresa (Régimen General + Empleador)</strong>. Cada uno tiene su propio progreso, regímenes y comprobantes.
          </div>
        </div>
      </Alert>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {allTaxpayerProfiles.map((tp: TaxpayerProfile) => {
          const isActive = (tp as any).is_active || tp.id === taxpayerProfile?.id
          const alias = (tp as any).alias ?? tp.entity_name
          const slot = (tp as any).slot ?? 1

          return (
            <Card key={tp.id} padding="md" className={`border-2 transition-all ${isActive ? 'border-primary-500 bg-primary-50/30' : 'border-slate-200'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-primary-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {tp.subject_type === 'persona_juridica'
                      ? <Building2 className="w-5 h-5" />
                      : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    {/* Alias editable */}
                    {editingId === tp.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editAlias}
                          onChange={e => setEditAlias(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveAlias(tp.id)}
                          className="text-sm font-semibold border border-primary-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 w-36"
                        />
                        <button onClick={() => saveAlias(tp.id)} disabled={savingAlias} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-800">{alias}</p>
                        <button onClick={() => startEdit(tp)} className="text-slate-300 hover:text-slate-500 transition-colors"><Pencil className="w-3 h-3" /></button>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400">Slot {slot} · {tp.subject_type === 'persona_juridica' ? 'Persona Jurídica' : 'Persona Humana'}</p>
                  </div>
                </div>
                {isActive && (
                  <span className="text-[10px] font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full flex-shrink-0">ACTIVO</span>
                )}
              </div>

              {/* Datos del contribuyente */}
              <div className="space-y-2 mb-4">
                <Row label="Razón social" value={tp.entity_name} />
                <Row label="CUIT" value={tp.cuit} mono />
                <Row label="Estado" value={
                  tp.status === 'active' ? '✅ Alta completada'
                  : tp.status === 'incomplete' ? '⚙️ En configuración'
                  : tp.status || 'Pendiente'
                } />
                {tp.main_activity_name && <Row label="Actividad" value={tp.main_activity_name} />}
                {tp.province && <Row label="Provincia" value={tp.province} />}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                {!isActive && (
                  <Button
                    size="sm"
                    onClick={() => handleSwitch(tp.id)}
                    loading={switching === tp.id}
                    className="flex-1"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Activar y continuar
                  </Button>
                )}
                {isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/perfil-contribuyente')}
                    className="flex-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar perfil
                  </Button>
                )}
                {isActive && tp.status !== 'active' && (
                  <Button
                    size="sm"
                    onClick={() => router.push('/alta-rut')}
                    className="flex-1"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Continuar alta
                  </Button>
                )}
              </div>
            </Card>
          )
        })}

        {/* Slot vacío — agregar contribuyente */}
        {canCreate && (
          <Card padding="md" className="border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[220px] gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Plus className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">Agregar segundo contribuyente</p>
              <p className="text-xs text-slate-400 mt-0.5">Se crea como empresa (Persona Jurídica)</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreate}
              loading={creating}
            >
              <Plus className="w-3.5 h-3.5" />
              Crear contribuyente
            </Button>
          </Card>
        )}

        {/* Límite alcanzado */}
        {!canCreate && allTaxpayerProfiles.length >= 2 && (
          <Card padding="md" className="border border-slate-100 bg-slate-50 flex flex-col items-center justify-center min-h-[100px]">
            <CheckCircle2 className="w-6 h-6 text-green-500 mb-2" />
            <p className="text-xs text-slate-500 text-center">Tenés los 2 contribuyentes disponibles creados.</p>
          </Card>
        )}
      </div>

      {/* Info pedagógica */}
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Consejo pedagógico:</strong> Usá el <strong>Slot 1</strong> para practicar el ciclo de un <em>Monotributista o Autónomo</em> (persona humana), y el <strong>Slot 2</strong> para simular una <em>empresa bajo Régimen General</em> con empleados y liquidación de IVA/Ganancias. Así cubrís ambos circuitos que aparecen en los exámenes.
        </p>
      </div>
    </PageContainer>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>
      <span className={`text-xs text-slate-700 text-right truncate max-w-[60%] ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
