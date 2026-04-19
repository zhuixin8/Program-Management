import React, { type ButtonHTMLAttributes, type ReactNode } from 'react'

type DashboardInlineActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

export function DashboardInlineActionButton({
  children,
  type = 'button',
  className = 'inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50',
  ...props
}: DashboardInlineActionButtonProps) {
  return (
    <button type={type} className={className} {...props}>
      {children}
    </button>
  )
}
