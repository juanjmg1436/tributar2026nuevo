'use client'

import { useRef } from 'react'
import { CertificadoRegimen, type CertificadoData } from './CertificadoRegimen'
import { useCertificadoPDF } from '@/hooks/useCertificadoPDF'
import { Download, X, FileText } from 'lucide-react'

interface Props {
  data: CertificadoData
  onClose: () => void
}

export function CertificadoModal({ data, onClose }: Props) {
  const certRef = useRef<HTMLDivElement>(null)
  const { exportar, generating } = useCertificadoPDF()

  const fileName = `Certificado_${data.regimeCode}_${data.cuit.replace(/-/g, '')}`

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">

        {/* Header del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Certificado de Inscripción</p>
              <p className="text-xs text-slate-400">{data.regimeName} · {data.certNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportar(certRef, fileName)}
              disabled={generating}
              className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              {generating ? 'Generando PDF…' : 'Descargar PDF'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vista previa del certificado — scrollable */}
        <div className="overflow-auto p-6 bg-slate-100 flex justify-center">
          <div className="transform origin-top" style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
            <CertificadoRegimen ref={certRef} data={data} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            ⚠️ Documento educativo sin validez fiscal. Solo para uso pedagógico.
          </p>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
