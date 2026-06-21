'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Users, ChevronDown, Plus, CheckCircle2, User } from 'lucide-react'
import type { TaxpayerProfile } from '@/types'

export function ContribuyenteSelector() {
  const { user, taxpayerProfile, allTaxpayerProfiles, setActiveTaxpayer, refresh } = useUser()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  if (!user) return null

  const canCreate = allTaxpayerProfiles.length < 2

  async function handleSelect(id: string) {
    setOpen(false)
    await setActiveTaxpayer(id)
  }

  async function handleCreate() {
    if (!canCreate || !user) return
    setCreating(true)
    // Slot 2 = persona jurídica (empresa) para practicar Régimen General / empleador
    const { error } = await supabase.from('taxpayer_profiles').insert({
      user_id: user.id,
      slot: 2,
      alias: 'Empresa (Slot 2)',
      is_active: false,
      entity_name: 'Mi Empresa S.R.L.',
      subject_type: 'persona_juridica',
      cuit: '30-00000002-0',
      status: 'incomplete',
    } as any)
    if (!error) await refresh()
    setCreating(false)
    setOpen(false)
  }

  const activeAlias = (taxpayerProfile as any)?.alias ?? taxpayerProfile?.entity_name ?? 'Contribuyente'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-primary-50 hover:bg-primary-100 border border-primary-200 text-primary-800 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
      >
        <Users className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate">{activeAlias}</span>
        <span className="text-primary-400 text-[10px]">{allTaxpayerProfiles.length}/2</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mis contribuyentes</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Podés tener hasta 2 para practicar distintos regímenes</p>
            </div>

            <div className="py-1">
              {allTaxpayerProfiles.map((tp: TaxpayerProfile) => {
                const isActive = (tp as any).is_active || tp.id === taxpayerProfile?.id
                const alias = (tp as any).alias ?? tp.entity_name
                const slot = (tp as any).slot ?? 1
                return (
                  <button
                    key={tp.id}
                    onClick={() => handleSelect(tp.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 ${isActive ? 'bg-primary-50' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isActive ? 'bg-primary-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {slot}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-primary-800' : 'text-slate-700'}`}>{alias}</p>
                      <p className="text-[10px] text-slate-400 truncate">{tp.entity_name} · {tp.status === 'active' ? '✅ Activo' : '⚙️ En configuración'}</p>
                    </div>
                    {isActive && <CheckCircle2 className="w-4 h-4 text-primary-600 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>

            {canCreate && (
              <div className="border-t border-slate-100 p-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-700 hover:bg-primary-50 rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {creating ? 'Creando...' : 'Agregar contribuyente'}
                </button>
              </div>
            )}

            {!canCreate && (
              <div className="border-t border-slate-100 px-4 py-2">
                <p className="text-[10px] text-slate-400 text-center">Límite alcanzado: 2/2 contribuyentes</p>
              </div>
            )}

            <div className="border-t border-slate-100 px-4 py-2">
              <a href="/contribuyentes" className="text-[10px] text-primary-600 hover:underline">
                Gestionar contribuyentes →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
