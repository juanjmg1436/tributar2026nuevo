'use client'

import { useState } from 'react'
import { AuthorPhoto } from '@/components/ui/AuthorPhoto'
import { Mail, ChevronDown, ChevronUp } from 'lucide-react'

export function AuthorSection() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      {/* Botón toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2.5 bg-white/8 hover:bg-white/15 border border-white/15 text-blue-300 hover:text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all"
      >
        <span className="text-base">👤</span>
        Sobre el autor
        {open
          ? <ChevronUp className="w-4 h-4" />
          : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Panel colapsable */}
      {open && (
        <div className="mt-8 text-left bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <AuthorPhoto size={100} />
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-white mb-0.5">Juan Manuel Gómez</h3>
              <p className="text-blue-300 text-sm font-medium mb-3">📍 Wanda, Misiones, Argentina</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                {[
                  '🎓 Prof. en Cs. Económicas — FHyCS, UNaM',
                  '📘 Lic. en Educación — Universidad FASTA',
                  '💡 Experto en Tecnología Educativa',
                ].map(tag => (
                  <span key={tag} className="text-xs bg-white/10 text-blue-200 border border-white/10 rounded-full px-3 py-1">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-blue-100 text-sm leading-relaxed mb-5">
                TRIBUT.AR nació de la necesidad de contar con una herramienta práctica y sin riesgos
                para aprender el sistema impositivo argentino. Desarrollada con Next.js 14, TypeScript,
                Supabase y Tailwind CSS, la plataforma cubre desde la inscripción ante AFIP hasta la
                liquidación de sueldos y los impuestos provinciales.
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {['Next.js 14', 'TypeScript', 'Supabase', 'Tailwind CSS', 'React 18'].map(tech => (
                  <span key={tech} className="text-xs font-medium bg-white/10 text-blue-200 border border-white/10 rounded-full px-3 py-1">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-blue-400">
              © 2026 Juan Manuel Gómez — Simul.Ar · TRIBUT.AR
            </p>
            <a
              href="mailto:simulareducativo@gmail.com"
              className="flex items-center gap-2 text-xs text-blue-300 hover:text-white transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              simulareducativo@gmail.com
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
