import React from 'react'

type WorkspaceTabOption<T extends string> = {
  key: T
  label: string
  shortLabel: string
  description: string
}

type WorkspaceTabNavProps<T extends string> = {
  tabs: WorkspaceTabOption<T>[]
  activeTab: T
  onChange: (tab: T) => void
  badgeTextClassName?: string
}

export function WorkspaceTabNav<T extends string>({
  tabs,
  activeTab,
  onChange,
  badgeTextClassName = 'text-xs',
}: WorkspaceTabNavProps<T>) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-lg border p-4 text-left transition ${
              isActive
                ? 'border-zinc-950 bg-zinc-950 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-semibold ${
                  isActive
                    ? 'bg-emerald-400 text-zinc-950'
                    : 'bg-zinc-100 text-zinc-700'
                } ${badgeTextClassName}`}
              >
                {tab.shortLabel}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {tab.label}
                </div>
                <div className={`mt-1 text-xs leading-6 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {tab.description}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
