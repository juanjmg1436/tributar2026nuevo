'use client'

import { Star, Zap } from 'lucide-react'
import type { LevelInfo } from '@/hooks/useMissions'
import { cn } from '@/lib/utils'

interface XpLevelBarProps {
  xp: number
  levelInfo: LevelInfo
}

const COLOR_MAP: Record<string, { bar: string; badge: string; glow: string }> = {
  slate:  { bar: 'from-slate-400 to-slate-500',   badge: 'bg-slate-100 text-slate-700',   glow: '' },
  blue:   { bar: 'from-blue-400 to-blue-600',     badge: 'bg-blue-100 text-blue-700',     glow: 'shadow-blue-200' },
  indigo: { bar: 'from-indigo-400 to-indigo-600', badge: 'bg-indigo-100 text-indigo-700', glow: 'shadow-indigo-200' },
  violet: { bar: 'from-violet-400 to-violet-600', badge: 'bg-violet-100 text-violet-700', glow: 'shadow-violet-200' },
  purple: { bar: 'from-purple-400 to-purple-600', badge: 'bg-purple-100 text-purple-700', glow: 'shadow-purple-200' },
  amber:  { bar: 'from-amber-400 to-amber-500',   badge: 'bg-amber-100 text-amber-700',   glow: 'shadow-amber-200' },
  orange: { bar: 'from-orange-400 to-orange-500', badge: 'bg-orange-100 text-orange-700', glow: 'shadow-orange-200' },
  yellow: { bar: 'from-yellow-400 to-yellow-500', badge: 'bg-yellow-100 text-yellow-700', glow: 'shadow-yellow-200' },
}

export function XpLevelBar({ xp, levelInfo }: XpLevelBarProps) {
  const colors = COLOR_MAP[levelInfo.color] ?? COLOR_MAP.slate
  const isMaxLevel = levelInfo.nextLevelXp === Infinity
  const xpInLevel = xp - levelInfo.minXp
  const xpNeeded  = isMaxLevel ? xpInLevel : levelInfo.nextLevelXp - levelInfo.minXp
  const pct       = isMaxLevel ? 100 : Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))

  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4 shadow-sm', levelInfo.level >= 4 && colors.glow && `shadow-md ${colors.glow}`)}>
      {/* Level badge */}
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0', colors.badge)}>
        {levelInfo.level >= 7 ? <Star className="w-5 h-5" /> : levelInfo.level}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div>
            <span className="text-xs font-bold text-slate-700">Nivel {levelInfo.level} </span>
            <span className="text-xs text-slate-500">— {levelInfo.name}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Zap className="w-3 h-3 text-amber-500" />
            <span className="text-xs font-black text-slate-800">{xp} XP</span>
          </div>
        </div>

        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', colors.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-[9px] text-slate-400 mt-1">
          {isMaxLevel
            ? '¡Nivel máximo alcanzado!'
            : `${xpInLevel} / ${xpNeeded} XP para Nivel ${levelInfo.level + 1} — ${levelInfo.level < 4 ? 'Seguí completando misiones' : '¡Vas muy bien!'}`
          }
        </p>
      </div>
    </div>
  )
}
