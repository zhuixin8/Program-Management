import React from 'react'

type WorkspaceMetricCardProps = {
  label: string
  value: React.ReactNode
  description: string
  className?: string
}

export function WorkspaceMetricCard({
  label,
  value,
  description,
  className = 'rounded-lg border border-zinc-200 bg-white px-4 py-4 shadow-sm',
}: WorkspaceMetricCardProps) {
  return (
    <div className={className}>
      <div className="text-xs font-semibold text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-950">{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{description}</div>
    </div>
  )
}
