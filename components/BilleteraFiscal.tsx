'use client'

import { useState } from 'react'
import { useBilletera } from '@/hooks/useBilletera'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Wallet, Plus, ArrowDownLeft, ArrowUpRight, Building2,
  Smartphone, CreditCard, X, CheckCircle2, AlertTriangle,
  Briefcase, FileText, Clock,
} from 'lucide-react'
import { useVencimientos } from '@/hooks/useVencimientos'

type MetodoCarga = 'homebanking' | 'mercadopago' | 'debito_auto'

const METODOS: { id: MetodoCarga; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'homebanking',  label: 'Homebanking',     icon: <Building2   className="w-5 h-5" />, color: 'blue'   },
  { id: 'mercadopago',  label: 'MercadoPago',      icon: <Smartphone  className="w-5 h-5" />, color: 'sky'    },
  { id: 'debito_auto',  label: 'Débito automático',icon: <CreditCard  className="w-5 h-5" />, color: 'violet' },
]

interface Props {
  /** Si se usa como modal externo, este callback cierra el modal */
  onClose?: () => void
  /** Vista compacta (chip de saldo) vs completa */
  compact?: boolean
  /**
   * Se llama cuando la carga de saldo se acreditó de verdad.
   * Cada módulo de pago tiene su propia instancia de useBilletera(), distinta
   * de la de este chip: sin este aviso el módulo sigue viendo el saldo viejo
   * y niega el pago aunque el chip ya muestre el saldo nuevo.
   */
  onSaldoCargado?: () => void
  /**
   * Cuánto falta para poder pagar la obligación que se está mirando.
   * Prellena el monto y ofrece un atajo: los botones rápidos llegan hasta
   * $500K y un F.931 puede superarlo, así que sin esto hay que tipear el
   * número a mano.
   */
  montoSugerido?: number
}

export function BilleteraFiscal({ onClose, compact = false, onSaldoCargado, montoSugerido }: Props) {
  const { balance, movimientos, loading, cargarSaldo } = useBilletera()
  const { vencimientos, loading: vencLoading } = useVencimientos()
  const pendientes = vencimientos.filter(v => !v.pagado)
  const totalPendiente = pendientes.reduce((s, v) => s + (v.monto ?? 0), 0)
  const hayVencidos = pendientes.some(v => v.vencido)

  const [showModal, setShowModal]     = useState(false)
  const [metodo, setMetodo]           = useState<MetodoCarga>('homebanking')
  const [monto, setMonto]             = useState('')
  const [confirming, setConfirming]   = useState(false)
  const [done, setDone]               = useState(false)
  const [refNum, setRefNum]           = useState('')
  const [errorCarga, setErrorCarga]   = useState<string | null>(null)

  const faltante = montoSugerido && montoSugerido > 0 ? Math.ceil(montoSugerido) : null

  function openModal() {
    setShowModal(true); setDone(false); setErrorCarga(null)
    setMonto(faltante ? String(faltante) : '')
  }
  function closeModal() { setShowModal(false); setDone(false); setMonto(''); setErrorCarga(null) }

  async function handleCargar() {
    const n = parseFloat(monto.replace(/\./g,'').replace(',','.'))
    if (!n || n <= 0) return
    setConfirming(true)
    setErrorCarga(null)
    try {
      await cargarSaldo(n, metodo)
      // La referencia y la pantalla de éxito recién ahora: antes se mostraban
      // aunque la carga no hubiera llegado a la base.
      setRefNum(`TRF-${Date.now().toString().slice(-10)}`)
      setDone(true)
      onSaldoCargado?.()
    } catch (e) {
      setErrorCarga(e instanceof Error ? e.message : 'No se pudo cargar el saldo.')
    } finally {
      setConfirming(false)
    }
  }

  // ── Chip compacto (para usar dentro de módulos de pago) ───────────────────
  if (compact) {
    return (
      <>
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold',
          balance >= 0
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800',
        )}>
          <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Billetera ARCA: {formatCurrency(balance)}</span>
          <button onClick={openModal}
            className="ml-1 flex items-center gap-0.5 text-violet-600 hover:text-violet-800 font-bold">
            <Plus className="w-3 h-3" /> Cargar
          </button>
        </div>

        {showModal && (
          <CargarSaldoModal
            metodo={metodo} setMetodo={setMetodo}
            monto={monto} setMonto={setMonto}
            confirming={confirming} done={done} refNum={refNum} error={errorCarga} faltante={faltante}
            onCargar={handleCargar}
            onClose={closeModal}
          />
        )}
      </>
    )
  }

  // ── Vista completa ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Balance */}
      <Card padding="md" className={cn(
        'border-2',
        balance >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50',
      )}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Saldo Billetera Fiscal ARCA</p>
            <p className={cn('text-3xl font-black', balance >= 0 ? 'text-emerald-800' : 'text-red-700')}>
              {loading ? '…' : formatCurrency(balance)}
            </p>
            {balance < 0 && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Saldo insuficiente para próximos pagos
              </p>
            )}
          </div>
          <Wallet className={cn('w-12 h-12 opacity-20', balance >= 0 ? 'text-emerald-800' : 'text-red-800')} />
        </div>
        <Button onClick={openModal} className="mt-4 w-full bg-violet-700 hover:bg-violet-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> Cargar saldo
        </Button>
      </Card>

      {/* Próximos vencimientos */}
      {!vencLoading && pendientes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-700">Próximos vencimientos</p>
            {totalPendiente > 0 && (
              <span className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                balance >= totalPendiente
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700',
              )}>
                {balance >= totalPendiente
                  ? '✓ Saldo suficiente'
                  : `Faltan ${formatCurrency(totalPendiente - balance)}`}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {pendientes.map(v => (
              <div key={v.id} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border',
                v.vencido ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200',
              )}>
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                  v.tipo === 'monotributo' ? 'bg-primary-100'
                  : v.tipo === 'autonomos'  ? 'bg-blue-100'
                  : 'bg-amber-100',
                )}>
                  {v.tipo === 'monotributo' ? <Wallet    className="w-3.5 h-3.5 text-primary-600" />
                  : v.tipo === 'autonomos'  ? <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  : <FileText className="w-3.5 h-3.5 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{v.concepto}</p>
                  <p className="text-[10px] text-slate-400">
                    Vence: {v.dueDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    {v.vencido && <span className="text-red-500 font-bold"> · VENCIDO</span>}
                  </p>
                </div>
                <p className={cn(
                  'text-sm font-black flex-shrink-0',
                  v.vencido ? 'text-red-600' : 'text-slate-700',
                )}>
                  {v.monto !== null ? formatCurrency(v.monto) : '—'}
                </p>
              </div>
            ))}
          </div>

          {hayVencidos && (
            <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl flex gap-2 items-start">
              <Clock className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-600 leading-relaxed">
                <strong>Interés resarcitorio:</strong> obligaciones vencidas acumulan 3% mensual
                (0,1% diario) sobre el capital adeudado — Art. 37 Ley 11.683. Cargá saldo y pagá cuanto antes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Movimientos */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-2">Últimos movimientos</p>
        {movimientos.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Sin movimientos aún.</p>
        ) : (
          <div className="space-y-1.5">
            {movimientos.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                  m.tipo === 'credito' ? 'bg-emerald-100' : 'bg-red-100')}>
                  {m.tipo === 'credito'
                    ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    : <ArrowUpRight  className="w-3.5 h-3.5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{m.concepto}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(m.created_at)} · {m.metodo ?? '—'}</p>
                </div>
                <p className={cn('text-sm font-black flex-shrink-0',
                  m.tipo === 'credito' ? 'text-emerald-700' : 'text-red-600')}>
                  {m.tipo === 'credito' ? '+' : '-'}{formatCurrency(m.monto)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal integrado */}
      {showModal && (
        <CargarSaldoModal
          metodo={metodo} setMetodo={setMetodo}
          monto={monto} setMonto={setMonto}
          confirming={confirming} done={done} refNum={refNum} error={errorCarga} faltante={faltante}
          onCargar={handleCargar}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

// ── Modal de carga de saldo ────────────────────────────────────────────────────
function CargarSaldoModal({
  metodo, setMetodo, monto, setMonto,
  confirming, done, refNum, error, faltante, onCargar, onClose,
}: {
  metodo: MetodoCarga; setMetodo: (m: MetodoCarga) => void
  monto: string; setMonto: (v: string) => void
  confirming: boolean; done: boolean; refNum: string
  error: string | null
  faltante: number | null
  onCargar: () => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-slate-800">Cargar saldo</p>
            <p className="text-xs text-slate-400">Billetera Fiscal ARCA</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">¡Saldo acreditado!</p>
              <p className="text-xs text-slate-500">Referencia: <span className="font-mono font-bold">{refNum}</span></p>
              <p className="text-xs text-slate-400">El saldo estará disponible para tus próximos pagos.</p>
              <Button onClick={onClose} className="w-full">Cerrar</Button>
            </div>
          ) : (
            <>
              {/* Selección de método */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">¿Cómo querés cargar?</p>
                <div className="grid grid-cols-3 gap-2">
                  {METODOS.map(m => (
                    <button key={m.id} onClick={() => setMetodo(m.id)}
                      className={cn('flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all',
                        metodo === m.id
                          ? 'border-violet-400 bg-violet-50 text-violet-800'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                      {m.icon}
                      <span className="text-center leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instrucciones por método */}
              {metodo === 'homebanking' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 space-y-1">
                  <p className="font-bold">Transferí a la cuenta ARCA:</p>
                  <p>CBU: <span className="font-mono">0110999801000000009901</span></p>
                  <p>Alias: <span className="font-mono">ARCA.BILLETERA.AR</span></p>
                  <p>CUIT receptor: <span className="font-mono">33-99999999-9</span></p>
                  <p className="text-blue-600">Usá tu CUIL como concepto de la transferencia.</p>
                </div>
              )}

              {metodo === 'mercadopago' && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-800 space-y-2">
                  <p className="font-bold">Pagá con MercadoPago:</p>
                  {/* QR simulado */}
                  <div className="flex justify-center">
                    <svg viewBox="0 0 80 80" className="w-20 h-20 border-2 border-sky-300 rounded-lg p-1 bg-white">
                      <rect x="0" y="0" width="80" height="80" fill="white"/>
                      {/* Patrón QR simulado */}
                      {[0,1,2,3,4,5,6].map(r => [0,1,2,3,4,5,6].map(c => (
                        ((r<3||r>3) && (c<3||c>3)) ? null :
                        <rect key={`${r}-${c}`} x={c*10+2} y={r*10+2} width="8" height="8"
                          fill={Math.random() > 0.4 ? '#0ea5e9' : 'white'} />
                      )))}
                      <rect x="2" y="2" width="28" height="28" fill="none" stroke="#0ea5e9" strokeWidth="2"/>
                      <rect x="50" y="2" width="28" height="28" fill="none" stroke="#0ea5e9" strokeWidth="2"/>
                      <rect x="2" y="50" width="28" height="28" fill="none" stroke="#0ea5e9" strokeWidth="2"/>
                    </svg>
                  </div>
                  <p className="text-center text-[10px] text-sky-600">Escanea con la app de MercadoPago</p>
                  <p className="text-sky-600">O buscá <strong>ARCA / Pagos AFIP</strong> en la app y cargá el monto abajo.</p>
                </div>
              )}

              {metodo === 'debito_auto' && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-800 space-y-1">
                  <p className="font-bold">Débito automático bancario</p>
                  <p>Autorizá a tu banco a debitar automáticamente tus obligaciones fiscales.</p>
                  <p className="text-violet-600">Se debitará el día del vencimiento directamente de tu cuenta. No necesitás hacer nada más.</p>
                  <p className="font-semibold mt-2">Cargar saldo inicial para próximos vencimientos:</p>
                </div>
              )}

              {/* Monto */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monto a cargar ($)</label>
                <input type="number" min="0" step="100"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="0.00" value={monto}
                  onChange={e => setMonto(e.target.value)} />
                {faltante && (
                  <button onClick={() => setMonto(String(faltante))}
                    className="w-full mt-1.5 text-[11px] py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-800 rounded font-bold transition-colors">
                    Cargar lo que falta — {formatCurrency(faltante)}
                  </button>
                )}
                <div className="flex gap-1 mt-1.5">
                  {[50000, 100000, 200000, 500000].map(v => (
                    <button key={v} onClick={() => setMonto(String(v))}
                      className="flex-1 text-[10px] py-1 bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-700 rounded font-semibold transition-colors">
                      {v >= 1000 ? `$${v/1000}K` : `$${v}`}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-700">
                    <p className="font-bold">No se pudo acreditar el saldo</p>
                    <p className="mt-0.5 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              <Button onClick={onCargar} loading={confirming}
                className="w-full bg-violet-700 hover:bg-violet-800 text-white"
                disabled={!monto || parseFloat(monto) <= 0}>
                Confirmar carga
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
