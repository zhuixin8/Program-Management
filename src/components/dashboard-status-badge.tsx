import React, { type ReactNode } from 'react'

type DashboardStatusBadgeTone = 'success' | 'neutral' | 'warning' | 'danger' | 'info'

type DashboardStatusBadgeProps = {
  label: ReactNode
  tone?: DashboardStatusBadgeTone
  className?: string
}

const toneClassNameMap: Record<DashboardStatusBadgeTone, string> = {
  success: 'inline-flex items-center rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700',
  neutral: 'inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700',
  warning: 'inline-flex items-center rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700',
  danger: 'inline-flex items-center rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700',
  info: 'inline-flex items-center rounded-lg bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-700',
}

export function DashboardStatusBadge({
  label,
  tone = 'neutral',
  className = toneClassNameMap[tone],
}: DashboardStatusBadgeProps) {
  return <span className={className}>{label}</span>
}
