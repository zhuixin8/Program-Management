import React, { type ReactNode } from 'react'

type DashboardStatTileProps = {
  label: ReactNode
  value: ReactNode
  description: ReactNode
  className?: string
  labelClassName?: string
  valueClassName?: string
  descriptionClassName?: string
}

export function DashboardStatTile({
  label,
  value,
  description,
  className = 'rounded-lg border border-zinc-200 bg-white px-4 py-4 shadow-sm',
  labelClassName = 'text-xs font-semibold text-zinc-500',
  valueClassName = 'mt-2 text-2xl font-semibold text-zinc-950',
  descriptionClassName = 'mt-1 text-sm text-zinc-500',
}: DashboardStatTileProps) {
  return (
    <div className={className}>
      <div className={labelClassName}>{label}</div>
      <div className={valueClassName}>{value}</div>
      <div className={descriptionClassName}>{description}</div>
    </div>
  )
}
