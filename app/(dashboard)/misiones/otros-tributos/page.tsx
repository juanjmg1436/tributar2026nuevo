'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { useProvincialTaxpayer } from '@/hooks/useProvincialTaxpayer'
import { formatCurrency } from '@/lib/utils'
import {
  INMOBILIARIO_RATES, AUTOMOTOR_RATES, SELLOS_CONTRACTS,
  MISIONES_DEPARTMENTS,
} from '@/lib/constants/misiones'
import { Home, Car, Stamp, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ProvRealEstate, ProvVehicle, ProvStamp } from '@/types/provincial'

type Tab = 'inmobiliario' | 'automotor' | 'sellos'

export default function OtrosTributosPage() {
  const { user, loading: userLoading } = useUser()
  const { taxpayer, loading: tpLoading } = useProvincialTaxpayer(user?.id)
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('inmobiliario')
  const [properties, setProperties] = useState<ProvRealEstate[]>([])
  const [vehicles, setVehicles] = useState<ProvVehicle[]>([])
  const [stamps, setStamps] = useState<ProvStamp[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Forms state
  const [propForm, setPropForm] = useState({ cadastral_number: '', description: '', locality: '', department: '', land_area: '', built_area: '', fiscal_value: '', category: 'urbano' as ProvRealEstate['category'] })
  const [vehForm, setVehForm] = useState({ plate: '', make: '', model: '', year: '', engine_cc: '', fiscal_value: '', category: 'automovil' as ProvVehicle['category'] })
  const [stampForm, setStampForm] = useState({ contract_type: 'locacion_inmueble', description: '', contract_date: '', contract_amount: '' })

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const db = supabase as any
    const [propRes, vehRes, stampRes] = await Promise.all([
      db.from('prov_real_estate').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      db.from('prov_vehicles').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      db.from('prov_stamps').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ])
    setProperties(propRes.data || [])
    setVehicles(vehRes.data || [])
    setStamps(stampRes.data || [])
    setLoading(false)
  }

  async function saveProperty() {
    if (!user || !taxpayer) return
    setSaving(true); setFormError(null)
    try {
      const fiscalValue = parseFloat(propForm.fiscal_value) || 0
      const rate = INMOBILIARIO_RATES[propForm.category]
      const annualTax = fiscalValue * rate
      const dept = MISIONES_DEPARTMENTS.find(d => d.code === propForm.department)
      const db = supabase as any
      await db.from('prov_real_estate').insert({
        user_id: user.id, taxpayer_id: taxpayer.id,
        cadastral_number: propForm.cadastral_number,
        description: propForm.description,
        locality: propForm.locality,
        department: dept?.name || propForm.department,
        land_area: parseFloat(propForm.land_area) || 0,
        built_area: parseFloat(propForm.built_area) || 0,
        fiscal_value: fiscalValue, rate, annual_tax: annualTax,
        category: propForm.category,
      })
      // Create payment
      await db.from('prov_payments').insert({
        user_id: user.id, taxpayer_id: taxpayer.id,
        tax_type: 'inmobiliario',
        concept: `Impuesto Inmobiliario — ${propForm.description}`,
        due_date: new Date(new Date().getFullYear(), 2, 31).toISOString().split('T')[0],
        amount: annualTax, surcharge: 0, total_amount: annualTax, status: 'pending',
      })
      await load(); setShowForm(false)
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function saveVehicle() {
    if (!user || !taxpayer) return
    setSaving(true); setFormError(null)
    try {
      const fiscalValue = parseFloat(vehForm.fiscal_value) || 0
      const rate = AUTOMOTOR_RATES[vehForm.category]
      const annualTax = fiscalValue * rate
      const db = supabase as any
      await db.from('prov_vehicles').insert({
        user_id: user.id, taxpayer_id: taxpayer.id,
        plate: vehForm.plate, make: vehForm.make, model: vehForm.model,
        year: parseInt(vehForm.year) || 2020,
        engine_cc: parseInt(vehForm.engine_cc) || 0,
        fiscal_value: fiscalValue, rate, annual_tax: annualTax,
        category: vehForm.category,
      })
      await db.from('prov_payments').insert({
        user_id: user.id, taxpayer_id: taxpayer.id,
        tax_type: 'automotor',
        concept: `Impuesto Automotor — ${vehForm.make} ${vehForm.model} (${vehForm.plate})`,
        due_date: new Date(new Date().getFullYear(), 2, 31).toISOString().split('T')[0],
        amount: annualTax, surcharge: 0, total_amount: annualTax, status: 'pending',
      })
      await load(); setShowForm(false)
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function saveStamp() {
    if (!user || !taxpayer) return
    setSaving(true); setFormError(null)
    try {
      const contractConfig = SELLOS_CONTRACTS.find(c => c.value === stampForm.contract_type)
      const amount = parseFloat(stampForm.contract_amount) || 0
      const rate = contractConfig?.rate || 0.01
      const taxAmount = amount * rate
      const db = supabase as any
      await db.from('prov_stamps').insert({
        user_id: user.id, taxpayer_id: taxpayer.id,
        contract_type: stampForm.contract_type,
        description: stampForm.description,
        contract_date: stampForm.contract_date,
        contract_amount: amount, rate, tax_amount: taxAmount,
        status: 'pending',
      })
      await db.from('prov_payments').insert({
        user_id: user.id, taxpayer_id: taxpayer.id,
        tax_type: 'sellos',
        concept: `Impuesto de Sellos — ${contractConfig?.label || stampForm.contract_type}`,
        due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        amount: taxAmount, surcharge: 0, total_amount: taxAmount, status: 'pending',
      })
      await load(); setShowForm(false)
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  if (userLoading || tpLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'inmobiliario', label: 'Inmobiliario', icon: <Home className="w-4 h-4" /> },
    { key: 'automotor', label: 'Automotor', icon: <Car className="w-4 h-4" /> },
    { key: 'sellos', label: 'Sellos', icon: <Stamp className="w-4 h-4" /> },
  ]

  return (
    <PageContainer title="Otros tributos provinciales" subtitle="Inmobiliario · Automotor · Sellos (simulación)">
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {!taxpayer ? (
        <Alert variant="warning">
          Primero completá el <a href="/misiones/alta" className="underline font-semibold">alta provincial →</a>
        </Alert>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setShowForm(false) }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {formError && <Alert variant="error" className="mb-4">{formError}</Alert>}

          {/* ── INMOBILIARIO ── */}
          {tab === 'inmobiliario' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-slate-600">Propiedades inmuebles registradas</p>
                  <p className="text-xs text-slate-400">Alícuotas: urbano 0,75% · periurbano 0,60% · rural 0,50%</p>
                </div>
                <Button size="sm" onClick={() => setShowForm(!showForm)}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar inmueble
                </Button>
              </div>

              {showForm && (
                <Card padding="md" className="mb-4 border-primary-200 bg-primary-50/30">
                  <h3 className="font-semibold text-slate-700 mb-4 text-sm">Nuevo inmueble</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={labelCls}>N° Catastral</label><input value={propForm.cadastral_number} onChange={e => setPropForm(p => ({...p, cadastral_number: e.target.value}))} className={inputCls} placeholder="Ej: 3300-001-0012-003" /></div>
                    <div><label className={labelCls}>Categoría</label>
                      <select value={propForm.category} onChange={e => setPropForm(p => ({...p, category: e.target.value as any}))} className={inputCls}>
                        <option value="urbano">Urbano (0,75%)</option>
                        <option value="periurbano">Periurbano (0,60%)</option>
                        <option value="rural">Rural (0,50%)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2"><label className={labelCls}>Descripción</label><input value={propForm.description} onChange={e => setPropForm(p => ({...p, description: e.target.value}))} className={inputCls} placeholder="Ej: Lote 12, Manzana 5 — Barrio Norte" /></div>
                    <div>
                      <label className={labelCls}>Departamento</label>
                      <select value={propForm.department} onChange={e => { const dept = MISIONES_DEPARTMENTS.find(d => d.code === e.target.value); setPropForm(p => ({...p, department: e.target.value, locality: ''})) }} className={inputCls}>
                        <option value="">Seleccioná...</option>
                        {MISIONES_DEPARTMENTS.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Localidad</label>
                      <select value={propForm.locality} onChange={e => setPropForm(p => ({...p, locality: e.target.value}))} className={inputCls}>
                        <option value="">Seleccioná...</option>
                        {(MISIONES_DEPARTMENTS.find(d => d.code === propForm.department)?.localities || []).map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Superficie terreno (m²)</label><input type="number" value={propForm.land_area} onChange={e => setPropForm(p => ({...p, land_area: e.target.value}))} className={inputCls} placeholder="0" /></div>
                    <div><label className={labelCls}>Superficie construida (m²)</label><input type="number" value={propForm.built_area} onChange={e => setPropForm(p => ({...p, built_area: e.target.value}))} className={inputCls} placeholder="0" /></div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Valor fiscal ($)</label>
                      <input type="number" value={propForm.fiscal_value} onChange={e => setPropForm(p => ({...p, fiscal_value: e.target.value}))} className={inputCls} placeholder="0.00" />
                      {propForm.fiscal_value && <p className="text-xs text-primary-600 mt-1">Impuesto anual: {formatCurrency((parseFloat(propForm.fiscal_value) || 0) * INMOBILIARIO_RATES[propForm.category])}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                    <Button size="sm" onClick={saveProperty} loading={saving}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Guardar inmueble
                    </Button>
                  </div>
                </Card>
              )}

              {properties.length === 0 ? (
                <Card padding="lg" className="text-center"><Home className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500 text-sm">Sin inmuebles registrados.</p></Card>
              ) : (
                <div className="space-y-3">
                  {properties.map(p => (
                    <Card key={p.id} padding="md">
                      <div className="flex justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{p.description}</p>
                          <p className="text-xs text-slate-500">{p.locality} · Catastral: {p.cadastral_number} · {p.category}</p>
                          <p className="text-xs text-slate-500">Superficie: {p.land_area}m² terreno · {p.built_area}m² construido</p>
                          <p className="text-xs text-slate-500">Valor fiscal: {formatCurrency(p.fiscal_value)} · Alíc.: {(p.rate * 100).toFixed(2)}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Impuesto anual</p>
                          <p className="text-lg font-bold text-primary-700">{formatCurrency(p.annual_tax)}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── AUTOMOTOR ── */}
          {tab === 'automotor' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-slate-600">Vehículos registrados</p>
                  <p className="text-xs text-slate-400">Alícuota: 2% automóviles · 2,5% camiones · 1,5% motos</p>
                </div>
                <Button size="sm" onClick={() => setShowForm(!showForm)}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar vehículo
                </Button>
              </div>

              {showForm && (
                <Card padding="md" className="mb-4 border-primary-200 bg-primary-50/30">
                  <h3 className="font-semibold text-slate-700 mb-4 text-sm">Nuevo vehículo</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className={labelCls}>Patente</label><input value={vehForm.plate} onChange={e => setVehForm(v => ({...v, plate: e.target.value}))} className={inputCls} placeholder="AA 123 BB" /></div>
                    <div><label className={labelCls}>Categoría</label>
                      <select value={vehForm.category} onChange={e => setVehForm(v => ({...v, category: e.target.value as any}))} className={inputCls}>
                        <option value="automovil">Automóvil (2%)</option>
                        <option value="camioneta">Camioneta (2%)</option>
                        <option value="camion">Camión (2,5%)</option>
                        <option value="moto">Moto (1,5%)</option>
                        <option value="otro">Otro (2%)</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Año</label><input type="number" value={vehForm.year} onChange={e => setVehForm(v => ({...v, year: e.target.value}))} className={inputCls} placeholder="2020" /></div>
                    <div><label className={labelCls}>Marca</label><input value={vehForm.make} onChange={e => setVehForm(v => ({...v, make: e.target.value}))} className={inputCls} placeholder="Ej: Toyota" /></div>
                    <div><label className={labelCls}>Modelo</label><input value={vehForm.model} onChange={e => setVehForm(v => ({...v, model: e.target.value}))} className={inputCls} placeholder="Ej: Hilux" /></div>
                    <div><label className={labelCls}>Cilindrada (cc)</label><input type="number" value={vehForm.engine_cc} onChange={e => setVehForm(v => ({...v, engine_cc: e.target.value}))} className={inputCls} placeholder="1800" /></div>
                    <div className="sm:col-span-3">
                      <label className={labelCls}>Valor fiscal ($)</label>
                      <input type="number" value={vehForm.fiscal_value} onChange={e => setVehForm(v => ({...v, fiscal_value: e.target.value}))} className={inputCls} placeholder="0.00" />
                      {vehForm.fiscal_value && <p className="text-xs text-primary-600 mt-1">Impuesto anual: {formatCurrency((parseFloat(vehForm.fiscal_value) || 0) * AUTOMOTOR_RATES[vehForm.category])}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                    <Button size="sm" onClick={saveVehicle} loading={saving}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Guardar vehículo</Button>
                  </div>
                </Card>
              )}

              {vehicles.length === 0 ? (
                <Card padding="lg" className="text-center"><Car className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500 text-sm">Sin vehículos registrados.</p></Card>
              ) : (
                <div className="space-y-3">
                  {vehicles.map(v => (
                    <Card key={v.id} padding="md">
                      <div className="flex justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{v.make} {v.model} ({v.year})</p>
                          <p className="text-xs text-slate-500">Patente: {v.plate} · {v.category} · {v.engine_cc}cc</p>
                          <p className="text-xs text-slate-500">Valor fiscal: {formatCurrency(v.fiscal_value)} · Alíc.: {(v.rate * 100).toFixed(1)}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Impuesto anual</p>
                          <p className="text-lg font-bold text-primary-700">{formatCurrency(v.annual_tax)}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── SELLOS ── */}
          {tab === 'sellos' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-slate-600">Instrumentos con Impuesto de Sellos</p>
                  <p className="text-xs text-slate-400">Alícuotas: locación 1% · compraventa inmueble 2,5% · crédito 1,2%</p>
                </div>
                <Button size="sm" onClick={() => setShowForm(!showForm)}>
                  <Plus className="w-4 h-4 mr-1" /> Nuevo instrumento
                </Button>
              </div>

              {showForm && (
                <Card padding="md" className="mb-4 border-primary-200 bg-primary-50/30">
                  <h3 className="font-semibold text-slate-700 mb-4 text-sm">Nuevo instrumento — Sellos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Tipo de instrumento</label>
                      <select value={stampForm.contract_type} onChange={e => setStampForm(s => ({...s, contract_type: e.target.value}))} className={inputCls}>
                        {SELLOS_CONTRACTS.map(c => <option key={c.value} value={c.value}>{c.label} ({(c.rate * 100).toFixed(1)}%)</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Fecha del instrumento</label><input type="date" value={stampForm.contract_date} onChange={e => setStampForm(s => ({...s, contract_date: e.target.value}))} className={inputCls} /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Descripción</label><input value={stampForm.description} onChange={e => setStampForm(s => ({...s, description: e.target.value}))} className={inputCls} placeholder="Breve descripción del instrumento" /></div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Monto del instrumento ($)</label>
                      <input type="number" value={stampForm.contract_amount} onChange={e => setStampForm(s => ({...s, contract_amount: e.target.value}))} className={inputCls} placeholder="0.00" />
                      {stampForm.contract_amount && (() => {
                        const cc = SELLOS_CONTRACTS.find(c => c.value === stampForm.contract_type)
                        return <p className="text-xs text-primary-600 mt-1">Impuesto de Sellos: {formatCurrency((parseFloat(stampForm.contract_amount) || 0) * (cc?.rate || 0.01))}</p>
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                    <Button size="sm" onClick={saveStamp} loading={saving}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Guardar instrumento</Button>
                  </div>
                </Card>
              )}

              {stamps.length === 0 ? (
                <Card padding="lg" className="text-center"><Stamp className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500 text-sm">Sin instrumentos registrados.</p></Card>
              ) : (
                <div className="space-y-3">
                  {stamps.map(s => {
                    const cc = SELLOS_CONTRACTS.find(c => c.value === s.contract_type)
                    return (
                      <Card key={s.id} padding="md">
                        <div className="flex justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{cc?.label || s.contract_type}</p>
                            <p className="text-xs text-slate-500">{s.description}</p>
                            <p className="text-xs text-slate-500">Fecha: {s.contract_date} · Monto: {formatCurrency(s.contract_amount)} · Alíc.: {(s.rate * 100).toFixed(1)}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Impuesto Sellos</p>
                            <p className="text-lg font-bold text-primary-700">{formatCurrency(s.tax_amount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                              {s.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageContainer>
  )
}
