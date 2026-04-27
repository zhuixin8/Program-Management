'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

import { ApiDocsAdminGroupCard } from '@/components/api-docs-admin-group-card'
import { ApiDocsDebugCommandCard } from '@/components/api-docs-debug-command-card'
import { DashboardCodePanel } from '@/components/dashboard-code-panel'
import { DashboardSummaryCard } from '@/components/dashboard-summary-card'
import { DashboardTableContainer } from '@/components/dashboard-table-container'
import { buildApiDocsPageModel } from '@/lib/api-docs-ui'
import {
  apiDocsWorkspaceTabs,
  type ApiDocsWorkspaceTab,
} from '@/lib/dashboard-workspace-tabs'
import {
  publicFeatureCardClassName,
  publicPanelClassName,
  publicPillClassName,
  publicPrimaryButtonClassName,
  publicSecondaryButtonClassName,
} from '@/lib/public-ui'

type ApiDocsWorkspaceProps = {
  mode?: 'dashboard' | 'public'
  initialTab?: ApiDocsWorkspaceTab
  onFeedback?: (content: string, type?: 'success' | 'error') => void
}

const summaryCardThemeMap = {
  sky: {
    panel: 'border-zinc-200 bg-white',
    accent: 'bg-emerald-500',
    value: 'text-zinc-950',
  },
  emerald: {
    panel: 'border-emerald-200 bg-emerald-50/70',
    accent: 'bg-emerald-500',
    value: 'text-emerald-900',
  },
  violet: {
    panel: 'border-zinc-200 bg-zinc-50',
    accent: 'bg-rose-500',
    value: 'text-zinc-950',
  },
} as const

const docsPublicSummaryCardThemeMap = {
  sky: {
    panel: 'border-white/10 bg-white/[0.04]',
    accent: 'bg-emerald-300',
    value: 'text-white',
  },
  emerald: {
    panel: 'border-emerald-300/25 bg-emerald-300/10',
    accent: 'bg-emerald-300',
    value: 'text-emerald-50',
  },
  violet: {
    panel: 'border-white/10 bg-white/[0.04]',
    accent: 'bg-amber-300',
    value: 'text-white',
  },
} as const

const audienceBadgeClassNameMap = {
  recommended: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  compat: 'border-zinc-200 bg-zinc-50 text-zinc-700',
} as const

const methodBadgeClassNameMap = {
  GET: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  POST: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PATCH: 'border-amber-200 bg-amber-50 text-amber-700',
  DELETE: 'border-rose-200 bg-rose-50 text-rose-700',
} as const

const tableContainerClassName =
  'rounded-lg border border-zinc-200 bg-white shadow-[0_18px_56px_-42px_rgba(24,24,27,0.16)]'

const inlineActionButtonClassName =
  'inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50'

const publicCodeBlockClassName =
  'overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-4 font-mono text-[12px] leading-6 text-zinc-100 shadow-inner'

const docsPublicPanelClassName =
  'rounded-lg border border-zinc-200 bg-white shadow-[0_18px_60px_-46px_rgba(24,24,27,0.28)]'

const docsPublicFeatureCardClassName =
  'rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_16px_52px_-44px_rgba(24,24,27,0.28)]'

const docsPublicPillClassName =
  'inline-flex items-center gap-2 rounded-md border border-emerald-300/[0.35] bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 shadow-sm'

const docsPublicPrimaryButtonClassName =
  'inline-flex items-center justify-center rounded-lg bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-950/15 transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50'

const docsPublicSecondaryButtonClassName =
  'inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50'

export function ApiDocsWorkspace({
  mode = 'dashboard',
  initialTab = 'overview',
  onFeedback,
}: ApiDocsWorkspaceProps) {
  const isPublicMode = mode === 'public'
  const panelClassName = isPublicMode ? docsPublicPanelClassName : publicPanelClassName
  const featureCardClassName = isPublicMode
    ? docsPublicFeatureCardClassName
    : publicFeatureCardClassName
  const pillClassName = isPublicMode ? docsPublicPillClassName : publicPillClassName
  const primaryButtonClassName = isPublicMode
    ? docsPublicPrimaryButtonClassName
    : publicPrimaryButtonClassName
  const secondaryButtonClassName = isPublicMode
    ? docsPublicSecondaryButtonClassName
    : publicSecondaryButtonClassName
  const introPanelClassName = isPublicMode
    ? 'rounded-lg border border-emerald-300/[0.18] bg-[#07100c] p-6 text-white shadow-[0_28px_90px_-66px_rgba(0,0,0,0.9)] sm:p-7'
    : `${panelClassName} p-6 sm:p-7`
  const introTitleClassName = isPublicMode
    ? 'mt-4 text-2xl font-semibold text-white'
    : 'mt-4 text-2xl font-semibold text-zinc-950'
  const introDescriptionClassName = isPublicMode
    ? 'mt-2 text-sm leading-7 text-zinc-300 sm:text-base'
    : 'mt-2 text-sm leading-7 text-zinc-600 sm:text-base'
  const asideClassName = isPublicMode
    ? 'rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-4 text-sm leading-6 text-emerald-50'
    : 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800 shadow-[0_18px_56px_-42px_rgba(24,24,27,0.16)]'
  const asideTitleClassName = isPublicMode
    ? 'font-semibold text-emerald-50'
    : 'font-semibold text-emerald-950'
  const asideDescriptionClassName = isPublicMode
    ? 'mt-1 text-emerald-100'
    : 'mt-1 text-emerald-800'
  const [activeTab, setActiveTab] = useState<ApiDocsWorkspaceTab>(initialTab)
  const [localFeedback, setLocalFeedback] = useState<{
    text: string
    type: 'success' | 'error'
  } | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)
  const apiDocsPageModel = useMemo(() => buildApiDocsPageModel(), [])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  const notify = (content: string, type: 'success' | 'error' = 'success') => {
    if (onFeedback) {
      onFeedback(content, type)
      return
    }

    setLocalFeedback({ text: content, type })
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setLocalFeedback(null)
    }, 2400)
  }

  const copyToClipboard = async (
    text: string,
    successMessage = '已复制到剪贴板',
  ) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard not supported')
      }

      await navigator.clipboard.writeText(text)
      notify(successMessage)
    } catch (error) {
      notify('当前环境不支持自动复制，请手动复制', 'error')
    }
  }

  const heroContent =
    mode === 'public'
      ? {
          badge: '公开接入文档',
          title: '桌面客户端激活码接入文档',
          description:
            '按 License v2 设备密钥、短期 token、签名状态查询和次数扣减说明正式接口，优先面向 Python 桌面程序接入。',
          asideTitle: '优先按 License v2 接入',
          asideDescription:
            '用户输入激活码时 enroll，token 快过期时 renew，程序启动和次数扣减都走签名请求。',
        }
      : {
          badge: 'API 接入说明',
          title: 'Python 桌面程序接入说明',
          description:
            '按后台准备 projectKey、客户端生成 machineId 和 Ed25519 设备密钥、License v2 五个接口来接入。',
          asideTitle: '不要把 API Secret 放进客户端',
          asideDescription:
            '客户端只调用公开授权接口；后台只用于创建项目、发码、吊销设备、封禁版本和查安全事件。',
        }

  if (isPublicMode) {
    const fieldSections = [
      { id: 'request-fields', title: 'Request body fields', fields: apiDocsPageModel.requestFields },
      { id: 'response-fields', title: 'Response envelope', fields: apiDocsPageModel.responseFields },
    ]

    return (
      <div id="docs-workspace" className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <nav className="rounded-lg border border-[#D8E5E0] bg-white p-3 shadow-[0_18px_54px_-48px_rgba(16,20,19,0.36)] lg:p-4">
            <div className="flex items-center justify-between gap-3 lg:block">
              <div className="font-mono text-xs font-semibold text-[#0F766E]">REST INDEX</div>
              <div className="rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-1 font-mono text-[11px] text-[#52615C] lg:hidden">
                HTTP JSON
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-sm font-semibold lg:mt-4 lg:grid lg:gap-1 lg:overflow-visible lg:pb-0">
              <a className="shrink-0 rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-2 text-[#52615C] transition hover:bg-[#F1F7F4] hover:text-[#0F766E] lg:border-0 lg:bg-transparent" href="#overview">Overview</a>
              <a className="shrink-0 rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-2 text-[#52615C] transition hover:bg-[#F1F7F4] hover:text-[#0F766E] lg:border-0 lg:bg-transparent" href="#integration-flow">Flow</a>
              <a className="shrink-0 rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-2 text-[#52615C] transition hover:bg-[#F1F7F4] hover:text-[#0F766E] lg:border-0 lg:bg-transparent" href="#schema">Schemas</a>
              <div className="hidden px-3 pb-1 pt-3 font-mono text-xs text-[#80908B] lg:block">Endpoints</div>
              {apiDocsPageModel.endpointGroups.map((group) => (
                <React.Fragment key={group.key}>
                  <a className="shrink-0 rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-2 text-[#101413] transition hover:bg-[#F1F7F4] hover:text-[#0F766E] lg:border-0 lg:bg-transparent" href={`#${group.key}`}>
                    {group.title}
                  </a>
                  {group.endpoints.map((endpoint) => (
                    <a key={endpoint.key} className="shrink-0 rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-2 text-[#52615C] transition hover:bg-[#F1F7F4] hover:text-[#0F766E] lg:border-0 lg:bg-transparent lg:pl-6" href={`#${endpoint.key}`}>
                      <span className="mr-2 font-mono text-xs text-[#0F766E]">{endpoint.method}</span>
                      {endpoint.path.replace('/api/license/', '')}
                    </a>
                  ))}
                </React.Fragment>
              ))}
              <a className="shrink-0 rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-2 text-[#52615C] transition hover:bg-[#F1F7F4] hover:text-[#0F766E] lg:border-0 lg:bg-transparent" href="#sdks">SDK examples</a>
              <a className="shrink-0 rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-2 text-[#52615C] transition hover:bg-[#F1F7F4] hover:text-[#0F766E] lg:border-0 lg:bg-transparent" href="#admin-api">Admin API</a>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 space-y-8">
          {!onFeedback && localFeedback && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${localFeedback.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-[#BDE8DC] bg-[#ECFDF6] text-[#0F766E]'}`}>
              {localFeedback.text}
            </div>
          )}

          <section id="overview" className="rounded-lg border border-[#D8E5E0] bg-white p-5 shadow-[0_18px_54px_-48px_rgba(16,20,19,0.36)] sm:p-6">
            <div className="font-mono text-xs font-semibold text-[#0F766E]">OVERVIEW</div>
            <h2 className="mt-3 text-3xl font-semibold text-[#101413]">桌面客户端接入总览</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#52615C]">
              先在后台创建项目并生成激活码，再让客户端保存稳定 machineId 和设备私钥。用户输入激活码时调用 v2 enroll，随后用短期 token 和设备签名调用 status / consume。
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {apiDocsPageModel.summaryCards.map((card) => (
                <DashboardSummaryCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  description={card.description}
                  panelClassName="border-[#D8E5E0] bg-[#F8FBF9]"
                  accentClassName={card.tone === 'emerald' ? 'bg-[#0F766E]' : card.tone === 'violet' ? 'bg-[#A16207]' : 'bg-[#0891B2]'}
                  labelClassName="font-mono text-xs font-semibold text-[#687773]"
                  valueClassName="mt-3 text-3xl font-semibold text-[#101413]"
                  descriptionClassName="mt-2 text-sm leading-6 text-[#52615C]"
                />
              ))}
            </div>
          </section>

          <section id="integration-flow" className="scroll-mt-24 rounded-lg border border-[#D8E5E0] bg-white p-5 shadow-[0_18px_54px_-48px_rgba(16,20,19,0.36)] sm:p-6">
            <div className="font-mono text-xs font-semibold text-[#0F766E]">INTEGRATION FLOW</div>
            <h2 className="mt-3 text-3xl font-semibold text-[#101413]">License v2 客户端接入流程</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#52615C]">
              新版流程按客户端生命周期拆分：后台发码、本机生成密钥、首次 enroll、启动 status、业务 consume、过期前 renew。
            </p>
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {apiDocsPageModel.integrationFlowSteps.map((step) => (
                <div key={step.step} className="rounded-lg border border-[#D8E5E0] bg-[#F8FBF9] p-5">
                  <div className="font-mono text-xs font-semibold text-[#0F766E]">
                    {step.step} / {step.phase}
                  </div>
                  <h3 className="mt-3 break-words text-lg font-semibold text-[#101413]">
                    {step.endpoint}
                  </h3>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-[#52615C]">
                    <p><span className="font-semibold text-[#101413]">客户端：</span>{step.clientAction}</p>
                    <p><span className="font-semibold text-[#101413]">服务端：</span>{step.serverAction}</p>
                    <p><span className="font-semibold text-[#101413]">成功结果：</span>{step.successResult}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="schema" className="grid min-w-0 gap-5 xl:grid-cols-2">
            {fieldSections.map((section) => (
              <div key={section.id} className="min-w-0 rounded-lg border border-[#D8E5E0] bg-white p-5 shadow-[0_18px_54px_-48px_rgba(16,20,19,0.36)]">
                <div className="font-mono text-xs font-semibold text-[#0F766E]">SCHEMA</div>
                <h2 className="mt-3 text-2xl font-semibold text-[#101413]">{section.title}</h2>
                <DashboardTableContainer className="mt-4 max-w-full rounded-lg border border-[#D8E5E0] bg-white shadow-none">
                  <table className="w-full min-w-max divide-y divide-[#D8E5E0]">
                    <thead className="bg-[#F8FBF9]">
                      <tr>
                        {['Field', 'Type', 'Required', 'Description'].map((heading) => (
                          <th key={heading} className="px-5 py-3 text-left text-xs font-semibold text-[#687773]">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8E5E0]">
                      {section.fields.map((field) => (
                        <tr key={field.field} className="hover:bg-[#F8FBF9]">
                          <td className="px-5 py-4 font-mono text-sm text-[#101413]">{field.field}</td>
                          <td className="px-5 py-4 text-sm text-[#52615C]">{field.type}</td>
                          <td className="px-5 py-4 text-sm text-[#52615C]">{field.required}</td>
                          <td className="px-5 py-4 text-sm text-[#52615C]">{field.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DashboardTableContainer>
              </div>
            ))}
          </section>

          {apiDocsPageModel.endpointGroups.map((group) => (
            <React.Fragment key={group.key}>
              <section id={group.key} className="scroll-mt-24 rounded-lg border border-[#D8E5E0] bg-white p-5 shadow-[0_18px_54px_-48px_rgba(16,20,19,0.36)] sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-1 font-mono text-xs font-semibold text-[#0F766E]">
                      {group.badge}
                    </span>
                    <h2 className="mt-3 text-3xl font-semibold text-[#101413]">{group.title}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#52615C]">{group.description}</p>
                  </div>
                  <div className="rounded-lg border border-[#D8E5E0] bg-[#F8FBF9] px-4 py-3 text-sm leading-6 text-[#52615C] lg:max-w-sm">
                    <span className="font-semibold text-[#101413]">调用顺序：</span>
                    {group.callOrder}
                  </div>
                </div>
              </section>
              {group.endpoints.map((endpoint) => (
                <section key={endpoint.key} id={endpoint.key} className="scroll-mt-24 rounded-lg border border-[#D8E5E0] bg-white p-5 shadow-[0_18px_54px_-48px_rgba(16,20,19,0.36)] sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-3 py-1 font-mono text-xs font-semibold ${methodBadgeClassNameMap[endpoint.method]}`}>{endpoint.method}</span>
                    <span className={`rounded-md border px-3 py-1 text-xs font-semibold ${audienceBadgeClassNameMap[endpoint.audience]}`}>
                      {endpoint.audience === 'recommended' ? 'Recommended' : 'Legacy'}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-[#101413]">{endpoint.title}</h2>
                  <div className="mt-3 break-all rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-4 py-3 font-mono text-sm text-[#101413]">
                    {endpoint.path}
                  </div>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[#52615C]">{endpoint.summary}</p>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-[#52615C]">{endpoint.whenToUse}</p>
                </div>
                <button type="button" onClick={() => void copyToClipboard(endpoint.path, '接口路径已复制')} className={docsPublicSecondaryButtonClassName}>
                  复制路径
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {endpoint.highlights.map((highlight) => (
                  <div key={highlight} className="rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-4 py-3 text-sm leading-6 text-[#52615C]">
                    {highlight}
                  </div>
                ))}
              </div>

              <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-2">
                <DashboardCodePanel
                  panelClassName="min-w-0 rounded-lg border border-[#D8E5E0] bg-white p-4 shadow-none"
                  header={<div className="font-semibold text-[#101413]">请求示例</div>}
                  action={<button type="button" onClick={() => void copyToClipboard(endpoint.requestExample, '请求示例已复制')} className={inlineActionButtonClassName}>Copy</button>}
                  code={endpoint.requestExample}
                  codeClassName={publicCodeBlockClassName}
                />
                <DashboardCodePanel
                  panelClassName="min-w-0 rounded-lg border border-[#D8E5E0] bg-white p-4 shadow-none"
                  header={<div className="font-semibold text-[#101413]">响应示例</div>}
                  action={<button type="button" onClick={() => void copyToClipboard(endpoint.responseExample, '响应示例已复制')} className={inlineActionButtonClassName}>Copy</button>}
                  code={endpoint.responseExample}
                  codeClassName={publicCodeBlockClassName}
                />
              </div>
                </section>
              ))}
            </React.Fragment>
          ))}

          <section id="sdks" className="space-y-5 scroll-mt-24">
            <div>
              <div className="font-mono text-xs font-semibold text-[#0F766E]">SDK EXAMPLES</div>
              <h2 className="mt-3 text-3xl font-semibold text-[#101413]">Python 和调用示例</h2>
            </div>
            {apiDocsPageModel.languageSnippets.map((snippet) => (
              <DashboardCodePanel
                key={snippet.key}
                panelClassName="min-w-0 rounded-lg border border-[#D8E5E0] bg-white p-5 shadow-[0_18px_54px_-48px_rgba(16,20,19,0.36)]"
                header={
                  <div>
                    <div className="font-mono text-xs font-semibold text-[#0F766E]">{snippet.label}</div>
                    <p className="mt-2 text-sm leading-7 text-[#52615C]">{snippet.description}</p>
                  </div>
                }
                action={<button type="button" onClick={() => void copyToClipboard(snippet.code, `${snippet.label} 示例已复制`)} className={docsPublicSecondaryButtonClassName}>复制示例代码</button>}
                code={snippet.code}
                codeClassName={publicCodeBlockClassName}
              />
            ))}
          </section>

          <section id="admin-api" className="scroll-mt-24 space-y-5">
            <div>
              <div className="font-mono text-xs font-semibold text-[#0F766E]">ADMIN API</div>
              <h2 className="mt-3 text-3xl font-semibold text-[#101413]">后台准备接口</h2>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {apiDocsPageModel.adminGroups.map((group) => (
                <ApiDocsAdminGroupCard
                  key={group.title}
                  title={group.title}
                  description={group.description}
                  endpoints={group.endpoints}
                  methodBadgeClassNameMap={methodBadgeClassNameMap}
                  className="rounded-lg border border-[#D8E5E0] bg-white p-5 shadow-[0_18px_54px_-48px_rgba(16,20,19,0.36)]"
                  endpointClassName="rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-4 py-4"
                />
              ))}
            </div>
          </section>
        </main>

        <aside className="hidden min-w-0 xl:block xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-lg border border-[#D8E5E0] bg-white p-4 shadow-[0_18px_54px_-48px_rgba(16,20,19,0.36)]">
            <div className="font-mono text-xs font-semibold text-[#0F766E]">QUICK START</div>
            <div className="mt-4 space-y-4 text-sm leading-6 text-[#52615C]">
              <div>
                <div className="font-semibold text-[#101413]">Base URL</div>
                <div className="mt-2 break-all rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-2 font-mono text-xs text-[#101413]">https://your-domain.com</div>
              </div>
              <div>
                <div className="font-semibold text-[#101413]">Headers</div>
                <div className="mt-2 rounded-md border border-[#D8E5E0] bg-[#F8FBF9] px-3 py-2 font-mono text-xs text-[#101413]">Content-Type: application/json</div>
              </div>
              <div>
                <div className="font-semibold text-[#101413]">Flow</div>
                <div className="mt-2 text-[#52615C]">enroll → status / consume → renew</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className={introPanelClassName}>
        <div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className={pillClassName}>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {heroContent.badge}
              </div>
              <h2 className={introTitleClassName}>{heroContent.title}</h2>
              <p className={introDescriptionClassName}>
                {heroContent.description}
              </p>
            </div>

            <div className={asideClassName}>
              <div className={asideTitleClassName}>{heroContent.asideTitle}</div>
              <div className={asideDescriptionClassName}>{heroContent.asideDescription}</div>
            </div>
          </div>

          {!onFeedback && localFeedback && (
            <div
              className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
                localFeedback.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {localFeedback.text}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {apiDocsPageModel.summaryCards.map((card) => {
              const summaryCardTheme = isPublicMode
                ? docsPublicSummaryCardThemeMap[card.tone]
                : summaryCardThemeMap[card.tone]

              return (
                <DashboardSummaryCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  description={card.description}
                  panelClassName={summaryCardTheme.panel}
                  accentClassName={summaryCardTheme.accent}
                  valueClassName={`mt-3 text-3xl font-semibold ${summaryCardTheme.value}`}
                  labelClassName={
                    isPublicMode
                      ? 'font-mono text-xs text-emerald-200'
                      : undefined
                  }
                  descriptionClassName={
                    isPublicMode
                      ? 'mt-2 text-sm leading-6 text-zinc-300'
                      : undefined
                  }
                />
              )
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {apiDocsWorkspaceTabs.map((tab) => {
              const isActive = activeTab === tab.key

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg border p-4 text-left transition ${
                    isPublicMode && isActive
                      ? 'border-emerald-300/[0.35] bg-emerald-300/10 shadow-[0_0_40px_rgba(16,185,129,0.14)]'
                      : isPublicMode
                        ? 'border-white/10 bg-white/[0.04] hover:-translate-y-0.5 hover:border-emerald-300/[0.28] hover:bg-white/[0.07]'
                        : isActive
                      ? 'border-emerald-200 bg-emerald-50 shadow-[0_20px_60px_-44px_rgba(5,150,105,0.28)]'
                      : 'border-zinc-200 bg-white hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                        isActive
                          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-600/20'
                          : isPublicMode
                            ? 'bg-white/[0.08] text-zinc-200 ring-1 ring-white/[0.12]'
                            : 'bg-zinc-950 text-white/90'
                      }`}
                    >
                      {tab.shortLabel}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-semibold ${
                          isPublicMode && isActive
                            ? 'text-emerald-50'
                            : isPublicMode
                              ? 'text-white'
                              : isActive
                                ? 'text-emerald-950'
                                : 'text-zinc-950'
                        }`}
                      >
                        {tab.label}
                      </div>
                      <div
                        className={`mt-1 text-xs leading-6 ${
                          isPublicMode && isActive
                            ? 'text-emerald-100'
                            : isPublicMode
                              ? 'text-zinc-400'
                              : isActive
                                ? 'text-emerald-800'
                                : 'text-zinc-600'
                        }`}
                      >
                        {tab.description}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className={`${panelClassName} p-6`}>
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-zinc-950">按这条线接入</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                先在后台准备 projectKey 和激活码，再让客户端生成 machineId 与 Ed25519 设备密钥，最后按 enroll、challenge、renew、status、consume 完成 v2 接入。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {apiDocsPageModel.researchSteps.map((step) => (
                <div key={step.step} className={featureCardClassName}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white shadow-sm">
                      {step.step}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-semibold text-zinc-950">
                        {step.title}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">
                        {step.description}
                      </p>
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                        <span className="font-medium text-emerald-950">你会得到：</span>{' '}
                        {step.outcome}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${panelClassName} p-6`}>
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-zinc-950">客户端调用明细</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                这里按真实生命周期拆开：本机要保存什么、调用哪个接口、服务端校验什么、成功后得到什么。
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {apiDocsPageModel.integrationFlowSteps.map((step) => (
                <div key={step.step} className={featureCardClassName}>
                  <div className="font-mono text-xs font-semibold text-emerald-700">
                    {step.step} / {step.phase}
                  </div>
                  <h4 className="mt-3 text-base font-semibold text-zinc-950">
                    {step.endpoint}
                  </h4>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
                    <p><span className="font-medium text-zinc-950">客户端：</span>{step.clientAction}</p>
                    <p><span className="font-medium text-zinc-950">服务端：</span>{step.serverAction}</p>
                    <p><span className="font-medium text-zinc-950">结果：</span>{step.successResult}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {apiDocsPageModel.licenseModels.map((card) => (
              <div key={card.badge} className={`${panelClassName} p-6`}>
                <div className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {card.badge}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-zinc-950">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{card.description}</p>
                <div className="mt-4 space-y-3">
                  {card.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-700"
                    >
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className={`${panelClassName} p-6`}>
              <div className="mb-5">
                <h3 className="text-xl font-semibold text-zinc-950">客户端请求字段</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  桌面客户端重点传 projectKey、code、machineId；次数卡扣减时再传 requestId。
                </p>
              </div>
              <DashboardTableContainer className={tableContainerClassName}>
                <table className="w-full min-w-max divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      {['字段', '类型', '必填', '说明'].map((title) => (
                        <th
                          key={title}
                          className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium text-zinc-500"
                        >
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {apiDocsPageModel.requestFields.map((field) => (
                      <tr key={field.field} className="transition hover:bg-zinc-50">
                        <td className="px-6 py-4 text-sm font-mono text-zinc-950">
                          {field.field}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600">{field.type}</td>
                        <td className="px-6 py-4 text-sm text-zinc-600">
                          {field.required}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600">
                          {field.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DashboardTableContainer>
            </div>

            <div className={`${panelClassName} p-6`}>
              <div className="mb-5">
                <h3 className="text-xl font-semibold text-zinc-950">客户端响应字段</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  客户端先判断 success 和 valid，再读取 remainingCount、expiresAt 或 idempotent 等业务字段。
                </p>
              </div>
              <DashboardTableContainer className={tableContainerClassName}>
                <table className="w-full min-w-max divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      {['字段', '类型', '返回时机', '说明'].map((title) => (
                        <th
                          key={title}
                          className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium text-zinc-500"
                        >
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {apiDocsPageModel.responseFields.map((field) => (
                      <tr key={field.field} className="transition hover:bg-zinc-50">
                        <td className="px-6 py-4 text-sm font-mono text-zinc-950">
                          {field.field}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600">{field.type}</td>
                        <td className="px-6 py-4 text-sm text-zinc-600">
                          {field.required}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600">
                          {field.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DashboardTableContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'endpoints' && (
        <div className="space-y-6">
          {apiDocsPageModel.endpointGroups.map((group) => (
            <React.Fragment key={group.key}>
              <div className={`${panelClassName} p-6`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                      {group.badge}
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-zinc-950">
                      {group.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {group.description}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700 xl:max-w-sm">
                    <span className="font-medium text-zinc-950">调用顺序：</span>{' '}
                    {group.callOrder}
                  </div>
                </div>
              </div>
              {group.endpoints.map((endpoint) => (
                <div key={endpoint.key} className={`${panelClassName} p-6`}>
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md border px-3 py-1 text-xs font-semibold ${methodBadgeClassNameMap[endpoint.method]}`}
                    >
                      {endpoint.method}
                    </span>
                    <span
                      className={`rounded-md border px-3 py-1 text-xs font-semibold ${audienceBadgeClassNameMap[endpoint.audience]}`}
                    >
                      {endpoint.audience === 'recommended'
                        ? '正式接口'
                        : '旧接口'}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-zinc-950">
                    {endpoint.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {endpoint.summary}
                  </p>
                  <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700">
                    <span className="font-medium text-zinc-950">什么时候调用：</span>{' '}
                    {endpoint.whenToUse}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-mono text-zinc-700 shadow-sm">
                    {endpoint.path}
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(endpoint.path, '接口路径已复制')}
                    className={secondaryButtonClassName}
                  >
                    复制路径
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.86fr_1.14fr]">
                <div className="space-y-3">
                  {endpoint.highlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-700"
                    >
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <DashboardCodePanel
                    header={
                      <div>
                        <div className="text-xs font-semibold text-zinc-500">
                          请求示例
                        </div>
                        <div className="mt-1 text-sm text-zinc-600">
                          可直接用于 Postman、脚本或客户端联调。
                        </div>
                      </div>
                    }
                    action={
                      <button
                        type="button"
                        onClick={() =>
                          void copyToClipboard(endpoint.requestExample, '请求示例已复制')
                        }
                        className={inlineActionButtonClassName}
                      >
                        复制
                      </button>
                    }
                    code={endpoint.requestExample}
                    codeClassName={isPublicMode ? publicCodeBlockClassName : undefined}
                  />

                  <DashboardCodePanel
                    header={
                      <div>
                        <div className="text-xs font-semibold text-zinc-500">
                          响应示例
                        </div>
                        <div className="mt-1 text-sm text-zinc-600">
                          用于核对业务是否成功、字段是否匹配以及是否命中幂等。
                        </div>
                      </div>
                    }
                    action={
                      <button
                        type="button"
                        onClick={() =>
                          void copyToClipboard(endpoint.responseExample, '响应示例已复制')
                        }
                        className={inlineActionButtonClassName}
                      >
                        复制
                      </button>
                    }
                    code={endpoint.responseExample}
                    codeClassName={isPublicMode ? publicCodeBlockClassName : undefined}
                  />
                </div>
              </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      )}

      {activeTab === 'examples' && (
        <div className="grid grid-cols-1 gap-6">
          {apiDocsPageModel.languageSnippets.map((snippet) => (
            <DashboardCodePanel
              key={snippet.key}
              panelClassName={`${panelClassName} p-6`}
              headerClassName="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
              header={
                <div className="max-w-3xl">
                  <div className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                    {snippet.label}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-zinc-950">
                    {snippet.label}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {snippet.description}
                  </p>
                </div>
              }
              action={
                <button
                  type="button"
                  onClick={() =>
                    void copyToClipboard(snippet.code, `${snippet.label} 示例已复制`)
                  }
                  className={primaryButtonClassName}
                >
                  复制示例代码
                </button>
              }
              code={snippet.code}
              codeClassName={isPublicMode ? publicCodeBlockClassName : undefined}
            />
          ))}
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="space-y-6">
          <div className={`${panelClassName} p-6`}>
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-zinc-950">
                后台需要准备什么
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                这些接口是后台自己用的管理接口。客户端不要调用它们，客户端只需要公开授权接口。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {apiDocsPageModel.adminGroups.map((group) => (
                <ApiDocsAdminGroupCard
                  key={group.title}
                  title={group.title}
                  description={group.description}
                  endpoints={group.endpoints}
                  methodBadgeClassNameMap={methodBadgeClassNameMap}
                />
              ))}
            </div>
          </div>

          <div className={`${panelClassName} p-6`}>
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-zinc-950">
                排查和本地验证
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                遇到客户反馈时，优先用后台日志核对激活码、machineId、requestId，再用烟雾测试确认接口链路。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {apiDocsPageModel.localDebugging.map((item) => (
                <ApiDocsDebugCommandCard
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  command={item.command}
                  onCopy={() => void copyToClipboard(item.command, `${item.title} 已复制`)}
                  buttonClassName={secondaryButtonClassName}
                  codeClassName={isPublicMode ? publicCodeBlockClassName : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
