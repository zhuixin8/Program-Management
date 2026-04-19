import React, { type ReactNode } from 'react'

type DashboardActionPanelProps = {
  badge: ReactNode
  title: ReactNode
  description: ReactNode
  action: ReactNode
  children?: ReactNode
  background?: ReactNode
  className?: string
  innerClassName?: string
  contentClassName?: string
  badgeClassName?: string
  titleClassName?: string
  descriptionClassName?: string
}

export function DashboardActionPanel({
  badge,
  title,
  description,
  action,
  children,
  background,
  className = 'rounded-lg border border-zinc-900/10 bg-zinc-950 p-5 text-white shadow-[0_24px_64px_-42px_rgba(39,39,42,0.7)]',
  innerClassName = 'flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between',
  contentClassName,
  badgeClassName = 'inline-flex items-center rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-200',
  titleClassName = 'mt-3 text-base font-semibold text-white',
  descriptionClassName = 'mt-1 text-sm leading-6 text-zinc-300',
}: DashboardActionPanelProps) {
  return (
    <div className={className}>
      {background}
      <div className={innerClassName}>
        <div className={contentClassName}>
          <div className={badgeClassName}>{badge}</div>
          <h3 className={titleClassName}>{title}</h3>
          <p className={descriptionClassName}>{description}</p>
          {children}
        </div>
        {action}
      </div>
    </div>
  )
}
