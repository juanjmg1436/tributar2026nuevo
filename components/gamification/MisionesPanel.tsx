'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, Lock, Clock, ArrowRight, Star } from 'lucide-react'
import type { MissionTrack, Mission } from '@/hooks/useMissions'
import { cn } from '@/lib/utils'

interface MisionesPanelProps {
  track: MissionTrack
  collapsed?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  inscripcion:   'Inscripción y alta',
  regimen:       'Situación tributaria',
  comprobantes:  'Comprobantes',
  obligaciones:  'Obligaciones fiscales',
}

const TRACK_COLORS = {
  MONOTRIBUTO:    { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500', icon: 'text-emerald-600' },
  REGIMEN_GENERAL: { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-800',       bar: 'bg-blue-500',    icon: 'text-blue-600' },
}

function MissionRow({ mission }: { mission: Mission }) {
  const isCompleted = mission.status === 'completed'
  const isAvailable = mission.status === 'available'
  const isLocked    = mission.status === 'locked'
  const isSoon      = mission.status === 'coming_soon'

  const content = (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
      isCompleted && 'bg-emerald-50',
      isAvailable && 'hover:bg-slate-50 cursor-pointer',
      (isLocked || isSoon) && 'opacity-60',
    )}>
      {/* Status icon */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        {isAvailable  && <Circle className="w-5 h-5 text-slate-300" />}
        {isLocked     && <Lock className="w-4 h-4 text-slate-300" />}
        {isSoon       && <Clock className="w-4 h-4 text-slate-300" />}
      </div>

      {/* Title + description */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-tight', isCompleted ? 'text-emerald-800 font-medium line-through decoration-emerald-300' : isAvailable ? 'text-slate-800 font-medium' : 'text-slate-500')}>
          {mission.title}
        </p>
        <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
          {mission.description}
        </p>
      </div>

      {/* XP + action */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded',
          isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
        )}>
          {isCompleted ? '✓' : '+'}{mission.xp} XP
        </span>

        {isSoon && (
          <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
            Próximo
          </span>
        )}

        {isAvailable && (
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        )}
      </div>
    </div>
  )

  if (isAvailable && mission.href) {
    return <Link href={mission.href}>{content}</Link>
  }
  return content
}

export function MisionesPanel({ track }: MisionesPanelProps) {
  const colors = TRACK_COLORS[track.regime]
  const pct = track.availableXp > 0 ? Math.round((track.earnedXp / track.availableXp) * 100) : 0

  const categories = Array.from(new Set(track.missions.map(m => m.category)))

  return (
    <div className={cn('rounded-xl border-2 overflow-hidden', colors.border)}>
      {/* Header */}
      <div className={cn('px-4 py-3', colors.bg)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-base">{track.icon}</span>
              <h3 className="font-bold text-slate-800 text-sm">{track.label}</h3>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', colors.badge)}>
                {track.completedCount}/{track.activeCount} completadas
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-snug">{track.description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-black text-slate-800">{track.earnedXp}</p>
            <p className="text-[9px] text-slate-400 -mt-0.5">XP ganados</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Progreso de la ruta</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', colors.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[9px] text-slate-400 mt-1">
            {track.earnedXp} / {track.availableXp} XP disponibles hoy
            {track.totalXp > track.availableXp && ` • ${track.totalXp - track.availableXp} XP más al completarse nuevos módulos`}
          </p>
        </div>
      </div>

      {/* Missions grouped by category */}
      <div className="bg-white divide-y divide-slate-50">
        {categories.map(cat => {
          const catMissions = track.missions.filter(m => m.category === cat)
          return (
            <div key={cat} className="px-2 py-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">
                {CATEGORY_LABELS[cat] || cat}
              </p>
              <div className="space-y-0.5">
                {catMissions.map(m => <MissionRow key={m.code} mission={m} />)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
