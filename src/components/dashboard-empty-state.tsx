import React, { type ReactNode } from 'react'

type DashboardEmptyStateProps = {
  message: ReactNode
  className?: string
}

export function DashboardEmptyState({
  message,
  className = '',
}: DashboardEmptyStateProps) {
  return (
    <div
      className={`rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500 ${className}`.trim()}
    >
      {message}
    </div>
  )
}
