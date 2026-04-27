import React from 'react'

import { DashboardInlineActionButton } from './dashboard-inline-action-button'
import { DashboardStatusBadge } from './dashboard-status-badge'

type DashboardProjectManagementRowProps = {
  project: {
    id: number
    name: string
    description?: string | null
    projectKey: string
    apiSecret?: string | null
    licenseV2OfflinePublicKey?: string | null
    isEnabled: boolean
  }
  policySummary: string[]
  loading: boolean
  onCopyProjectKey: () => void
  onCopyApiSecret: () => void
  onCopyOfflinePublicKey: () => void
  onEditBasics: () => void
  onEditRebind: () => void
  onToggleStatus: () => void
  onDelete: () => void
}

export function DashboardProjectManagementRow({
  project,
  policySummary,
  loading,
  onCopyProjectKey,
  onCopyApiSecret,
  onCopyOfflinePublicKey,
  onEditBasics,
  onEditRebind,
  onToggleStatus,
  onDelete,
}: DashboardProjectManagementRowProps) {
  const isDefaultProject = project.projectKey === 'default'

  return (
    <tr className="transition hover:bg-slate-50/80">
      <td className="px-6 py-4 text-sm text-slate-900">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{project.name}</span>
            {isDefaultProject ? (
              <span className="inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                默认项目
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-slate-500">
            {project.description?.trim() || '未填写项目描述'}
          </p>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
        <div className="space-y-2">
          <div className="font-mono text-sm text-slate-700">{project.projectKey}</div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase text-zinc-400">API Secret</div>
            <div className="mt-1 max-w-[260px] truncate font-mono text-xs text-zinc-600">
              {project.apiSecret || '未配置'}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase text-emerald-500">
              License v2 离线公钥
            </div>
            <div className="mt-1 max-w-[260px] truncate font-mono text-xs text-emerald-700">
              {project.licenseV2OfflinePublicKey || '未生成'}
            </div>
          </div>
          <div className="text-xs leading-5 text-slate-400">
            {isDefaultProject ? '默认项目不可停用，也不可删除。' : '用于 API 接入、发码隔离与筛选。'}
          </div>
        </div>
      </td>

      <td className="px-6 py-4 text-sm text-slate-500">
        <div className="max-w-sm space-y-2">
          {policySummary.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600"
            >
              {item}
            </div>
          ))}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
        {project.isEnabled ? (
          <DashboardStatusBadge label="启用中" tone="success" />
        ) : (
          <DashboardStatusBadge label="已停用" tone="neutral" />
        )}
      </td>

      <td className="px-6 py-4 text-sm font-medium">
        <div className="flex flex-wrap gap-2">
          <DashboardInlineActionButton onClick={onCopyProjectKey} disabled={loading}>
            复制标识
          </DashboardInlineActionButton>
          <DashboardInlineActionButton onClick={onCopyApiSecret} disabled={loading || !project.apiSecret}>
            复制 Secret
          </DashboardInlineActionButton>
          <DashboardInlineActionButton
            onClick={onCopyOfflinePublicKey}
            disabled={loading || !project.licenseV2OfflinePublicKey}
          >
            复制离线公钥
          </DashboardInlineActionButton>
          <DashboardInlineActionButton onClick={onEditBasics} disabled={loading}>
            编辑基础信息
          </DashboardInlineActionButton>
          <DashboardInlineActionButton onClick={onEditRebind} disabled={loading}>
            编辑换绑策略
          </DashboardInlineActionButton>
          <DashboardInlineActionButton
            onClick={onToggleStatus}
            disabled={loading || (isDefaultProject && project.isEnabled)}
          >
            {project.isEnabled ? '停用' : '启用'}
          </DashboardInlineActionButton>
          {isDefaultProject ? null : (
            <DashboardInlineActionButton onClick={onDelete} disabled={loading}>
              删除
            </DashboardInlineActionButton>
          )}
        </div>
      </td>
    </tr>
  )
}
