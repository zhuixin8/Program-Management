import React, { type ReactNode } from 'react'

type WorkspaceHeroPanelProps = {
  badge: string
  title: string
  description: string
  metrics: ReactNode
  tabs: ReactNode
  gradientClassName: string
}

export function WorkspaceHeroPanel({
  badge,
  title,
  description,
  metrics,
  tabs,
  gradientClassName,
}: WorkspaceHeroPanelProps) {
  return (
    <div className="relative overflow-hidden p-6 sm:p-7">
      <div className={`absolute inset-x-0 top-0 h-1 ${gradientClassName}`} />
      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-lg bg-emerald-500" />
              {badge}
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-zinc-950">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-500 sm:text-base">{description}</p>
          </div>

          {metrics}
        </div>

        {tabs}
      </div>
    </div>
  )
}
