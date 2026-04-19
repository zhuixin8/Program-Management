import React from 'react'

type DashboardTokenListProps = {
  tokens: string[]
  emptyText: string
  className?: string
  tokenClassName?: string
  emptyClassName?: string
}

const defaultClassName = 'flex flex-wrap gap-2'
const defaultTokenClassName = 'rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm text-cyan-700'
const defaultEmptyClassName = 'rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500'

export function DashboardTokenList({
  tokens,
  emptyText,
  className = defaultClassName,
  tokenClassName = defaultTokenClassName,
  emptyClassName = defaultEmptyClassName,
}: DashboardTokenListProps) {
  return (
    <div className={className}>
      {tokens.length > 0 ? (
        tokens.map((token) => (
          <span key={token} className={tokenClassName}>
            {token}
          </span>
        ))
      ) : (
        <span className={emptyClassName}>{emptyText}</span>
      )}
    </div>
  )
}
