import React from 'react'

import type { AdminEndpointDoc } from '@/lib/api-docs-ui'

type ApiDocsAdminGroupCardProps = {
  title: string
  description: string
  endpoints: AdminEndpointDoc[]
  methodBadgeClassNameMap: Record<AdminEndpointDoc['method'], string>
  className?: string
  endpointListClassName?: string
  endpointClassName?: string
}

const defaultClassName =
  'rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_18px_56px_-42px_rgba(24,24,27,0.22)]'
const defaultEndpointListClassName = 'mt-4 space-y-3'
const defaultEndpointClassName =
  'rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4'

export function ApiDocsAdminGroupCard({
  title,
  description,
  endpoints,
  methodBadgeClassNameMap,
  className = defaultClassName,
  endpointListClassName = defaultEndpointListClassName,
  endpointClassName = defaultEndpointClassName,
}: ApiDocsAdminGroupCardProps) {
  return (
    <div className={className}>
      <h4 className="text-lg font-semibold text-zinc-950">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
      <div className={endpointListClassName}>
        {endpoints.map((endpoint) => (
          <div
            key={`${endpoint.method}-${endpoint.path}`}
            className={endpointClassName}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-3 py-1 text-xs font-semibold ${
                  methodBadgeClassNameMap[endpoint.method]
                }`}
              >
                {endpoint.method}
              </span>
              <span className="text-sm font-mono text-zinc-950">{endpoint.path}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{endpoint.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
