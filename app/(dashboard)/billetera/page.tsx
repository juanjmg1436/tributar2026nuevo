import { BilleteraFiscal } from '@/components/BilleteraFiscal'
import { Info } from 'lucide-react'

export const metadata = { title: 'Billetera Fiscal ARCA — TRIBUT.AR' }

export default function BilleteraPage() {
  return (
    <div className="max-w-lg mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">Billetera Fiscal</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Administrá tu saldo para pagar impuestos y contribuciones patronales.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-xs text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold mb-1">¿Cómo funciona la Billetera Fiscal?</p>
          <p>
            La <strong>Billetera Fiscal de ARCA</strong> te permite pre-cargar fondos y usarlos para
            pagar automáticamente tus obligaciones (Monotributo, Autónomos, F.931 / VEP) sin
            necesidad de iniciar sesión en homebanking cada vez que vence un impuesto.
          </p>
          <p className="mt-1">
            También podés habilitar el <strong>débito automático</strong>: el sistema descuenta el
            monto justo en la fecha de vencimiento desde tu cuenta bancaria vinculada.
          </p>
          <p className="mt-1">
            En este simulador, los pagos que hagas desde cualquier módulo se reflejarán aquí como
            débitos, igual que en la realidad.
          </p>
        </div>
      </div>

      <BilleteraFiscal />
    </div>
  )
}
