'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'

import { ApiDocsAdminGroupCard } from '@/components/api-docs-admin-group-card'
import { DashboardCodePanel } from '@/components/dashboard-code-panel'
import { DashboardTableContainer } from '@/components/dashboard-table-container'
import {
  buildApiDocsPageModel,
  type ApiEndpointDoc,
  type ApiFieldDoc,
} from '@/lib/api-docs-ui'

type FeedbackState = {
  text: string
  type: 'success' | 'error'
} | null

const sidebarLinkClassName =
  'block min-w-max rounded-md px-3 py-2 text-sm text-[#4B5563] transition hover:bg-[#F4F6F8] hover:text-[#111827] lg:min-w-0'

const sidebarEndpointLinkClassName =
  'flex min-h-10 min-w-max items-center gap-2 rounded-md px-3 py-2 text-sm text-[#4B5563] transition hover:bg-[#F4F6F8] hover:text-[#111827] lg:min-w-0'

const docSectionClassName =
  'scroll-mt-28 border-b border-[#E5E7EB] py-10 first:pt-0 last:border-b-0'

const docTitleClassName = 'text-2xl font-semibold leading-tight text-[#111827]'

const docTextClassName = 'mt-3 text-[15px] leading-8 text-[#4B5563]'

const methodBadgeClassNameMap = {
  GET: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  POST: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PATCH: 'border-amber-200 bg-amber-50 text-amber-700',
  DELETE: 'border-rose-200 bg-rose-50 text-rose-700',
} as const

const apiMethodBadgeClassNameMap: Record<ApiEndpointDoc['method'], string> = {
  POST: 'border-[#B7E7D6] bg-[#EAFBF4] text-[#047857]',
}

const codeClassName =
  'max-w-full overflow-x-auto rounded-lg border border-[#111827] bg-[#0B1120] px-4 py-4 font-mono text-[12px] leading-6 text-[#E5E7EB] shadow-none'

const codePanelClassName =
  'min-w-0 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-none'

const copyButtonClassName =
  'inline-flex min-h-9 items-center justify-center rounded-md border border-[#D8DDE3] bg-white px-3 text-xs font-semibold text-[#374151] transition hover:bg-[#F4F6F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]'

function FieldTable({ fields }: { fields: ApiFieldDoc[] }) {
  return (
    <DashboardTableContainer className="mt-4 max-w-full rounded-lg border border-[#E5E7EB] bg-white shadow-none">
      <table className="w-full min-w-[760px] divide-y divide-[#E5E7EB]">
        <thead className="bg-[#F8FAFC]">
          <tr>
            {['参数名', '类型', '必填', '说明'].map((heading) => (
              <th
                key={heading}
                className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {fields.map((field) => (
            <tr key={field.field} className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-4 font-mono text-sm text-[#111827]">
                {field.field}
              </td>
              <td className="px-4 py-4 text-sm text-[#4B5563]">{field.type}</td>
              <td className="px-4 py-4 text-sm text-[#4B5563]">
                {field.required}
              </td>
              <td className="px-4 py-4 text-sm leading-6 text-[#4B5563]">
                {field.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardTableContainer>
  )
}

function EndpointSection({
  endpoint,
  onCopy,
}: {
  endpoint: ApiEndpointDoc
  onCopy: (text: string, successMessage?: string) => void
}) {
  return (
    <section id={endpoint.key} className={docSectionClassName}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border px-2.5 py-1 font-mono text-xs font-semibold ${apiMethodBadgeClassNameMap[endpoint.method]}`}
            >
              {endpoint.method}
            </span>
            <span className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-[#4B5563]">
              {endpoint.audience === 'recommended' ? '推荐接口' : '兼容接口'}
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[#111827]">
            {endpoint.title}
          </h2>
          <div className="mt-3 flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
            <span className="break-all font-mono text-sm text-[#111827]">
              {endpoint.path}
            </span>
          </div>
          <p className={docTextClassName}>{endpoint.summary}</p>
          <p className="mt-2 text-[15px] leading-8 text-[#4B5563]">
            {endpoint.whenToUse}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onCopy(endpoint.path, '接口路径已复制')}
          className={copyButtonClassName}
        >
          复制路径
        </button>
      </div>

      <h3 className="mt-8 text-lg font-semibold text-[#111827]">请求说明</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {endpoint.highlights.map((highlight) => (
          <div
            key={highlight}
            className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm leading-6 text-[#4B5563]"
          >
            {highlight}
          </div>
        ))}
      </div>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-2">
        <DashboardCodePanel
          panelClassName={codePanelClassName}
          header={<div className="font-semibold text-[#111827]">请求示例</div>}
          action={
            <button
              type="button"
              onClick={() => onCopy(endpoint.requestExample, '请求示例已复制')}
              className={copyButtonClassName}
            >
              复制
            </button>
          }
          code={endpoint.requestExample}
          codeClassName={codeClassName}
        />
        <DashboardCodePanel
          panelClassName={codePanelClassName}
          header={<div className="font-semibold text-[#111827]">响应示例</div>}
          action={
            <button
              type="button"
              onClick={() => onCopy(endpoint.responseExample, '响应示例已复制')}
              className={copyButtonClassName}
            >
              复制
            </button>
          }
          code={endpoint.responseExample}
          codeClassName={codeClassName}
        />
      </div>
    </section>
  )
}

export function ApiDocsApifoxWorkspace() {
  const feedbackTimerRef = useRef<number | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const apiDocsPageModel = useMemo(() => buildApiDocsPageModel(), [])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  const copyToClipboard = async (
    text: string,
    successMessage = '已复制到剪贴板',
  ) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard not supported')
      }

      await navigator.clipboard.writeText(text)
      setFeedback({ text: successMessage, type: 'success' })
    } catch (error) {
      setFeedback({ text: '当前环境不支持自动复制，请手动复制', type: 'error' })
    }

    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null)
    }, 2400)
  }

  const tocItems = [
    ['#overview', '接口概览'],
    ['#quick-start', '快速接入'],
    ['#signature', 'API 签名'],
    ['#auth-flow', '授权流程'],
    ['#request-fields', '请求参数'],
    ['#response-fields', '响应结构'],
    ...apiDocsPageModel.endpoints.map((endpoint) => [
      `#${endpoint.key}`,
      endpoint.title,
    ]),
    ['#sdk-examples', '调用示例'],
    ['#admin-api', '后台接口'],
  ]

  return (
    <div className="mx-auto grid max-w-[1560px] grid-cols-1 gap-0 px-4 sm:px-6 lg:grid-cols-[268px_minmax(0,1fr)] lg:px-8 2xl:grid-cols-[268px_minmax(0,1fr)_244px]">
      <aside className="border-b border-[#E5E7EB] bg-[#FBFCFD] py-4 lg:sticky lg:top-[97px] lg:h-[calc(100dvh-97px)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:pr-5">
        <nav aria-label="API 文档目录">
          <div className="mb-3 flex items-center justify-between gap-3 lg:block">
            <div className="text-sm font-semibold text-[#111827]">文档目录</div>
            <div className="rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 font-mono text-[11px] text-[#6B7280] lg:hidden">
              License API
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-6 lg:overflow-visible lg:pb-0">
            <div className="contents lg:block lg:min-w-0">
              <div className="hidden px-3 pb-2 text-xs font-semibold text-[#9CA3AF] lg:block">
                开始使用
              </div>
              <a className={sidebarLinkClassName} href="#overview">
                接口概览
              </a>
              <a className={sidebarLinkClassName} href="#quick-start">
                快速接入
              </a>
              <a className={sidebarLinkClassName} href="#signature">
                API 签名
              </a>
              <a className={sidebarLinkClassName} href="#auth-flow">
                授权流程
              </a>
            </div>
            <div className="contents lg:block lg:min-w-0">
              <div className="hidden px-3 pb-2 text-xs font-semibold text-[#9CA3AF] lg:block">
                License API
              </div>
              {apiDocsPageModel.endpoints.map((endpoint) => (
                <a
                  key={endpoint.key}
                  className={sidebarEndpointLinkClassName}
                  href={`#${endpoint.key}`}
                >
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${apiMethodBadgeClassNameMap[endpoint.method]}`}
                  >
                    {endpoint.method}
                  </span>
                  <span>{endpoint.title}</span>
                </a>
              ))}
            </div>
            <div className="contents lg:block lg:min-w-0">
              <div className="hidden px-3 pb-2 text-xs font-semibold text-[#9CA3AF] lg:block">
                参考资料
              </div>
              <a className={sidebarLinkClassName} href="#request-fields">
                请求参数
              </a>
              <a className={sidebarLinkClassName} href="#response-fields">
                响应结构
              </a>
              <a className={sidebarLinkClassName} href="#sdk-examples">
                调用示例
              </a>
              <a className={sidebarLinkClassName} href="#admin-api">
                后台接口
              </a>
            </div>
          </div>
        </nav>
      </aside>

      <article className="min-w-0 bg-white px-0 py-8 lg:px-12 lg:py-10 xl:px-16">
        {feedback && (
          <div
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              feedback.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-[#B7E7D6] bg-[#EAFBF4] text-[#047857]'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <header className="border-b border-[#E5E7EB] pb-9">
          <div className="text-sm text-[#6B7280]">公开文档 / License API</div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#111827] sm:text-5xl">
            License API 接入文档
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#4B5563]">
            给插件、桌面客户端和联调方使用的公开文档。先确认项目和授权模型，再按 activate、status、consume
            的顺序接入；历史客户端继续使用 verify 兼容入口。
          </p>
          <div className="relative mt-7 aspect-[16/7] w-full overflow-hidden rounded-lg border border-[#E5E7EB]">
            <Image
              src="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1500&q=80"
              alt="代码编辑器中的接口开发工作区"
              fill
              priority
              unoptimized
              sizes="(min-width: 1280px) 900px, 100vw"
              className="object-cover"
            />
          </div>
        </header>

        <section id="overview" className={docSectionClassName}>
          <h2 className={docTitleClassName}>接口概览</h2>
          <p className={docTextClassName}>
            新客户端使用三段式流程：首次录入激活码调用 activate，启动或展示授权信息调用 status，真实业务发生时调用
            consume。/api/verify 只保留给旧版本客户端兼容。
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {apiDocsPageModel.summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-[#E5E7EB] bg-[#FBFCFD] p-5"
              >
                <div className="text-sm font-semibold text-[#6B7280]">
                  {card.label}
                </div>
                <div className="mt-3 text-3xl font-semibold text-[#111827]">
                  {card.value}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="quick-start" className={docSectionClassName}>
          <h2 className={docTitleClassName}>快速接入</h2>
          <p className={docTextClassName}>
            所有接口都使用 HTTP JSON。请求字段兼容 camelCase 和 snake_case；生产环境只需要把 Base URL
            替换为你的部署地址，并为每台设备保存稳定的 machineId。
          </p>
          <div className="mt-5 overflow-hidden rounded-lg border border-[#E5E7EB]">
            {[
              ['Base URL', 'http://127.0.0.1:3000'],
              ['Content-Type', 'application/json'],
              ['推荐流程', 'activate -> status -> consume'],
              ['设备标识', 'machineId 需要在客户端本地持久化'],
              ['幂等键', 'consume 请求建议始终传 requestId'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 border-b border-[#E5E7EB] px-4 py-4 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)]"
              >
                <div className="text-sm font-semibold text-[#6B7280]">
                  {label}
                </div>
                <div className="break-all font-mono text-sm text-[#111827]">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="signature" className={docSectionClassName}>
          <h2 className={docTitleClassName}>项目级 API 签名</h2>
          <p className={docTextClassName}>
            每个 projectKey 都有独立的 API Secret。正式 License API 请求必须携带
            X-License-Timestamp、X-License-Nonce、X-License-Signature 和
            X-License-Signature-Version，服务端会校验时间窗口、签名和 nonce 重放。
          </p>
          <div className="mt-5 overflow-hidden rounded-lg border border-[#E5E7EB]">
            {[
              ['签名算法', 'HMAC-SHA256 hex'],
              ['签名串', 'METHOD + "\\n" + PATH + "\\n" + TIMESTAMP + "\\n" + NONCE + "\\n" + SHA256(body)'],
              ['时间窗口', '默认允许前后 5 分钟'],
              ['重放防护', '同一 projectKey 下 nonce 只能使用一次'],
              ['限速', '默认每 IP + projectKey + path 每分钟 120 次，可用环境变量调整'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 border-b border-[#E5E7EB] px-4 py-4 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)]"
              >
                <div className="text-sm font-semibold text-[#6B7280]">
                  {label}
                </div>
                <div className="break-all font-mono text-sm text-[#111827]">
                  {value}
                </div>
              </div>
            ))}
          </div>
          <DashboardCodePanel
            panelClassName={`${codePanelClassName} mt-6`}
            header={<div className="font-semibold text-[#111827]">Node.js 签名示例</div>}
            action={
              <button
                type="button"
                onClick={() => copyToClipboard(apiDocsPageModel.signatureExample, '签名示例已复制')}
                className={copyButtonClassName}
              >
                复制示例
              </button>
            }
            code={apiDocsPageModel.signatureExample}
            codeClassName={codeClassName}
          />
        </section>

        <section id="auth-flow" className={docSectionClassName}>
          <h2 className={docTitleClassName}>授权流程</h2>
          <p className={docTextClassName}>
            联调前先确认 projectKey、授权模型和测试激活码。完成一次 activate 后，再用同一组 code + machineId
            查询状态、触发扣次，并在后台消费日志中按 requestId 回查。
          </p>
          <div className="mt-6 space-y-4">
            {apiDocsPageModel.researchSteps.map((step) => (
              <div
                key={step.step}
                className="grid gap-4 rounded-lg border border-[#E5E7EB] bg-[#FBFCFD] p-5 sm:grid-cols-[64px_minmax(0,1fr)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#111827] font-mono text-sm font-semibold text-white">
                  {step.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#111827]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[#4B5563]">
                    {step.description}
                  </p>
                  <p className="mt-3 rounded-lg border border-[#D9EFE7] bg-[#F0FBF6] px-4 py-3 text-sm leading-6 text-[#047857]">
                    {step.outcome}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="request-fields" className={docSectionClassName}>
          <h2 className={docTitleClassName}>公共请求参数</h2>
          <p className={docTextClassName}>
            正式接口共用以下字段。projectKey 用于项目隔离，code 是激活码正文，machineId 表示设备，requestId
            用于 consume 幂等扣次。
          </p>
          <FieldTable fields={apiDocsPageModel.requestFields} />
        </section>

        <section id="response-fields" className={docSectionClassName}>
          <h2 className={docTitleClassName}>响应数据结构</h2>
          <p className={docTextClassName}>
            响应同时返回 camelCase 和 snake_case 字段，便于新旧客户端共存。前端展示授权状态时优先使用
            licenseMode、expiresAt、remainingCount、valid 和 message。
          </p>
          <FieldTable fields={apiDocsPageModel.responseFields} />
        </section>

        {apiDocsPageModel.endpoints.map((endpoint) => (
          <EndpointSection
            key={endpoint.key}
            endpoint={endpoint}
            onCopy={copyToClipboard}
          />
        ))}

        <section id="sdk-examples" className={docSectionClassName}>
          <h2 className={docTitleClassName}>多语言调用示例</h2>
          <p className={docTextClassName}>
            示例覆盖 SDK、Python 和 cURL。先用本地服务完成一次 activate / status / consume，再替换 Base URL
            接入生产环境。
          </p>
          <div className="mt-6 space-y-5">
            {apiDocsPageModel.languageSnippets.map((snippet) => (
              <DashboardCodePanel
                key={snippet.key}
                panelClassName={codePanelClassName}
                header={
                  <div>
                    <div className="font-semibold text-[#111827]">
                      {snippet.label}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[#4B5563]">
                      {snippet.description}
                    </p>
                  </div>
                }
                action={
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(snippet.code, `${snippet.label} 示例已复制`)
                    }
                    className={copyButtonClassName}
                  >
                    复制示例
                  </button>
                }
                code={snippet.code}
                codeClassName={codeClassName}
              />
            ))}
          </div>
        </section>

        <section id="admin-api" className={docSectionClassName}>
          <h2 className={docTitleClassName}>后台联调接口</h2>
          <p className={docTextClassName}>
            后台接口用于项目管理、发码、消费日志和统计导出。它们需要管理员会话，不应直接暴露给插件或桌面客户端。
          </p>
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {apiDocsPageModel.adminGroups.map((group) => (
              <ApiDocsAdminGroupCard
                key={group.title}
                title={group.title}
                description={group.description}
                endpoints={group.endpoints}
                methodBadgeClassNameMap={methodBadgeClassNameMap}
                className="rounded-lg border border-[#E5E7EB] bg-[#FBFCFD] p-5 shadow-none"
                endpointClassName="rounded-lg border border-[#E5E7EB] bg-white px-4 py-4"
              />
            ))}
          </div>
        </section>
      </article>

      <aside className="hidden bg-white py-10 pl-5 2xl:sticky 2xl:top-[97px] 2xl:block 2xl:h-[calc(100dvh-97px)] 2xl:overflow-y-auto 2xl:border-l 2xl:border-[#E5E7EB]">
        <div className="text-sm font-semibold text-[#111827]">本文目录</div>
        <nav className="mt-4 space-y-1" aria-label="本文目录">
          {tocItems.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="block rounded-md px-3 py-2 text-sm leading-5 text-[#6B7280] transition hover:bg-[#F4F6F8] hover:text-[#111827]"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
    </div>
  )
}
