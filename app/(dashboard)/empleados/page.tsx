'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Employer, Employee } from '@/types/fiscal'
import { AlertTriangle, Info, Users, Plus, Trash2, Building2, UserPlus, RefreshCw } from 'lucide-react'

export default function EmpleadosPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<'employer' | 'employees'>('employer')
  const [showEmployerForm, setShowEmployerForm] = useState(false)
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)

  const [employer, setEmployer] = useState<Employer | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])

  const [empForm, setEmpForm] = useState({
    cuit: '', entity_name: '', activity: '', address: '', locality: '',
    art_insurer: 'Experta ART', obra_social: 'OSECAC', convention_type: 'Convenio Comercio',
  })

  const [workerForm, setWorkerForm] = useState({
    cuil: '', full_name: '', hire_date: new Date().toISOString().split('T')[0],
    position: '', schedule_type: 'completa' as Employee['schedule_type'],
    basic_salary: '', contract_type: 'indeterminado', obra_social: 'OSECAC', art: 'Experta ART',
    workplace: '',
  })

  useEffect(() => { if (!user) return; loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const db = supabase as any
    const [empRes, workRes] = await Promise.all([
      db.from('employers').select('*').eq('user_id', user!.id).maybeSingle(),
      db.from('employees').select('*').eq('user_id', user!.id).neq('status', 'baja').order('full_name'),
    ])
    setEmployer(empRes.data || null)
    setEmployees(workRes.data || [])
    setLoading(false)
  }

  async function handleSaveEmployer() {
    if (!user) return
    if (!empForm.cuit.trim() || !empForm.entity_name.trim()) { setError('CUIT y razón social son obligatorios.'); return }
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      const payload = { user_id: user.id, ...empForm, status: 'active' as const, registered_at: new Date().toISOString().split('T')[0] }
      if (employer) {
        await db.from('employers').update(payload).eq('id', employer.id)
      } else {
        await db.from('employers').insert(payload)
      }
      setSuccess('Datos del empleador guardados.')
      setShowEmployerForm(false)
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function handleSaveEmployee() {
    if (!user || !employer) return
    if (!workerForm.cuil.trim() || !workerForm.full_name.trim() || !workerForm.position.trim()) {
      setError('CUIL, nombre completo y cargo son obligatorios.'); return
    }
    if (!parseFloat(workerForm.basic_salary) || parseFloat(workerForm.basic_salary) <= 0) {
      setError('El salario básico debe ser mayor a cero.'); return
    }
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      await db.from('employees').insert({
        employer_id: employer.id,
        user_id: user.id,
        cuil: workerForm.cuil,
        full_name: workerForm.full_name,
        hire_date: workerForm.hire_date,
        position: workerForm.position,
        schedule_type: workerForm.schedule_type,
        basic_salary: parseFloat(workerForm.basic_salary),
        contract_type: workerForm.contract_type,
        obra_social: workerForm.obra_social,
        art: workerForm.art,
        workplace: workerForm.workplace,
        status: 'active',
      })
      setSuccess(`Trabajador "${workerForm.full_name}" dado de alta.`)
      setShowEmployeeForm(false)
      setWorkerForm(f => ({ ...f, cuil: '', full_name: '', position: '', basic_salary: '', workplace: '' }))
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function handleTerminate(id: string, name: string) {
    if (!confirm(`¿Dar de baja a ${name}?`)) return
    await (supabase as any).from('employees').update({
      status: 'baja', termination_date: new Date().toISOString().split('T')[0]
    }).eq('id', id)
    setSuccess(`${name} dado de baja.`)
    await loadData()
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Empleadores y trabajadores" subtitle="Alta registral y nómina de personal (simulación didáctica)">
      {/* Disclaimer */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* Info pedagógica */}
      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Empleadores en Argentina:</strong> Para contratar personal, la empresa debe registrarse como empleadora ante AFIP/ARCA.
          Cada trabajador se da de alta con su CUIL, fecha de ingreso y salario básico convenional.
          El empleador retiene los aportes del trabajador (17%) y paga las contribuciones patronales (≈30%) sobre el salario bruto.
          Esta información alimenta la liquidación de sueldos y la DDJJ de cargas sociales (F.931).
        </p>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'employer', label: 'Empresa empleadora', icon: <Building2 className="w-4 h-4" /> },
          { key: 'employees', label: `Nómina (${employees.length})`, icon: <Users className="w-4 h-4" /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
        <button onClick={loadData} className="ml-2 p-2 text-slate-400 hover:text-slate-600"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>

      {/* Tab: Empleador */}
      {tab === 'employer' && (
        <>
          {employer && !showEmployerForm ? (
            <Card padding="md" className="mb-5 border-emerald-200 bg-emerald-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <p className="font-bold text-emerald-800">{employer.entity_name}</p>
                  </div>
                  <p className="text-xs text-slate-600">CUIT: {employer.cuit}</p>
                  <p className="text-xs text-slate-600">Actividad: {employer.activity}</p>
                  <p className="text-xs text-slate-600">Domicilio: {employer.address}, {employer.locality}</p>
                  <p className="text-xs text-slate-600">ART: {employer.art_insurer} · OS: {employer.obra_social}</p>
                  <p className="text-xs text-slate-600">Convenio: {employer.convention_type}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  setEmpForm({ cuit: employer.cuit, entity_name: employer.entity_name, activity: employer.activity, address: employer.address, locality: employer.locality, art_insurer: employer.art_insurer, obra_social: employer.obra_social, convention_type: employer.convention_type })
                  setShowEmployerForm(true)
                }}>Editar</Button>
              </div>
            </Card>
          ) : (
            <Card padding="md" className="mb-5 border-primary-200 bg-primary-50/20">
              <h3 className="font-semibold text-slate-700 mb-4 text-sm">
                {employer ? 'Editar datos del empleador' : 'Alta como empleador'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>CUIT empresa</label>
                  <input value={empForm.cuit} onChange={e => setEmpForm(f => ({...f, cuit: e.target.value}))} className={inputCls} placeholder="XX-XXXXXXXX-X" />
                </div>
                <div>
                  <label className={labelCls}>Razón social / nombre empresa</label>
                  <input value={empForm.entity_name} onChange={e => setEmpForm(f => ({...f, entity_name: e.target.value}))} className={inputCls} placeholder="Ej: Mi Empresa SRL" />
                </div>
                <div>
                  <label className={labelCls}>Actividad principal</label>
                  <input value={empForm.activity} onChange={e => setEmpForm(f => ({...f, activity: e.target.value}))} className={inputCls} placeholder="Ej: Comercio minorista" />
                </div>
                <div>
                  <label className={labelCls}>Convenio colectivo</label>
                  <select value={empForm.convention_type} onChange={e => setEmpForm(f => ({...f, convention_type: e.target.value}))} className={inputCls}>
                    <option>Convenio Comercio</option>
                    <option>Convenio Gastronómico</option>
                    <option>Convenio Construcción</option>
                    <option>Convenio Empleados de Comercio</option>
                    <option>Sin convenio</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Domicilio laboral</label>
                  <input value={empForm.address} onChange={e => setEmpForm(f => ({...f, address: e.target.value}))} className={inputCls} placeholder="Calle y número" />
                </div>
                <div>
                  <label className={labelCls}>Localidad</label>
                  <input value={empForm.locality} onChange={e => setEmpForm(f => ({...f, locality: e.target.value}))} className={inputCls} placeholder="Ciudad, Provincia" />
                </div>
                <div>
                  <label className={labelCls}>ART aseguradora</label>
                  <select value={empForm.art_insurer} onChange={e => setEmpForm(f => ({...f, art_insurer: e.target.value}))} className={inputCls}>
                    <option>Experta ART</option>
                    <option>Galeno ART</option>
                    <option>Prevención ART</option>
                    <option>QBE ART</option>
                    <option>Otra ART</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Obra social</label>
                  <select value={empForm.obra_social} onChange={e => setEmpForm(f => ({...f, obra_social: e.target.value}))} className={inputCls}>
                    <option>OSECAC</option>
                    <option>OSDE</option>
                    <option>Swiss Medical</option>
                    <option>IOMA</option>
                    <option>Medicus</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                {employer && <Button size="sm" variant="outline" onClick={() => setShowEmployerForm(false)}>Cancelar</Button>}
                <Button size="sm" onClick={handleSaveEmployer} loading={saving}>
                  {employer ? 'Guardar cambios' : 'Registrar como empleador'}
                </Button>
              </div>
            </Card>
          )}

          {!employer && !showEmployerForm && (
            <div className="text-center py-10">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm mb-4">Primero registrá los datos de la empresa empleadora.</p>
              <Button onClick={() => setShowEmployerForm(true)}><Plus className="w-4 h-4 mr-1" /> Registrar empresa</Button>
            </div>
          )}
        </>
      )}

      {/* Tab: Nómina */}
      {tab === 'employees' && (
        <>
          {!employer && (
            <Alert variant="warning" className="mb-4">
              Primero debes registrar la empresa empleadora en la pestaña "Empresa empleadora".
            </Alert>
          )}

          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-600">{employees.length} trabajadores activos</p>
            {employer && (
              <Button size="sm" onClick={() => setShowEmployeeForm(!showEmployeeForm)}>
                <UserPlus className="w-4 h-4 mr-1" /> Alta de trabajador
              </Button>
            )}
          </div>

          {showEmployeeForm && employer && (
            <Card padding="md" className="mb-5 border-primary-200 bg-primary-50/20">
              <h3 className="font-semibold text-slate-700 mb-4 text-sm">Nuevo trabajador</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>CUIL</label>
                  <input value={workerForm.cuil} onChange={e => setWorkerForm(f => ({...f, cuil: e.target.value}))} className={inputCls} placeholder="XX-XXXXXXXX-X" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Apellido y nombre</label>
                  <input value={workerForm.full_name} onChange={e => setWorkerForm(f => ({...f, full_name: e.target.value}))} className={inputCls} placeholder="Apellido, Nombre" />
                </div>
                <div>
                  <label className={labelCls}>Fecha de ingreso</label>
                  <input type="date" value={workerForm.hire_date} onChange={e => setWorkerForm(f => ({...f, hire_date: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cargo / función</label>
                  <input value={workerForm.position} onChange={e => setWorkerForm(f => ({...f, position: e.target.value}))} className={inputCls} placeholder="Ej: Vendedor, Administrativo" />
                </div>
                <div>
                  <label className={labelCls}>Tipo de jornada</label>
                  <select value={workerForm.schedule_type} onChange={e => setWorkerForm(f => ({...f, schedule_type: e.target.value as any}))} className={inputCls}>
                    <option value="completa">Jornada completa</option>
                    <option value="parcial">Jornada parcial</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Salario básico ($)</label>
                  <input type="number" value={workerForm.basic_salary} onChange={e => setWorkerForm(f => ({...f, basic_salary: e.target.value}))} className={inputCls} placeholder="0.00" min="0" />
                </div>
                <div>
                  <label className={labelCls}>Tipo de contrato</label>
                  <select value={workerForm.contract_type} onChange={e => setWorkerForm(f => ({...f, contract_type: e.target.value}))} className={inputCls}>
                    <option value="indeterminado">Tiempo indeterminado</option>
                    <option value="determinado">Tiempo determinado</option>
                    <option value="obra">Por obra</option>
                    <option value="pasantia">Pasantía</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Lugar de trabajo</label>
                  <input value={workerForm.workplace} onChange={e => setWorkerForm(f => ({...f, workplace: e.target.value}))} className={inputCls} placeholder="Sucursal / establecimiento" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => setShowEmployeeForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveEmployee} loading={saving}>Dar de alta</Button>
              </div>
            </Card>
          )}

          {employees.length === 0 ? (
            <Card padding="lg" className="text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Sin trabajadores registrados.</p>
              <p className="text-xs text-slate-400 mt-1">Dá de alta a los empleados para poder liquidar sueldos y declarar cargas sociales.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {employees.map(w => (
                <Card key={w.id} padding="none">
                  <div className="flex items-center justify-between gap-3 p-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{w.full_name}</p>
                      <p className="text-xs text-slate-500">CUIL: {w.cuil} · {w.position} · Ingreso: {formatDate(w.hire_date)}</p>
                      <p className="text-xs text-slate-400">{w.contract_type} · {w.schedule_type} · Básico: {formatCurrency(w.basic_salary)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        w.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        w.status === 'licencia' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {w.status === 'active' ? 'Activo' : w.status === 'licencia' ? 'Licencia' : 'Baja'}
                      </span>
                      <button onClick={() => handleTerminate(w.id, w.full_name)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Dar de baja">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {employees.length > 0 && (
            <div className="mt-4 flex gap-3">
              <a href="/sueldos"><Button variant="outline" size="sm">Liquidar sueldos →</Button></a>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
