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
    ['#overview', '接入步骤'],
    ['#quick-start', '准备信息'],
    ['#signature', '签名说明'],
    ['#auth-flow', '完整流程'],
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
                接入步骤
              </a>
              <a className={sidebarLinkClassName} href="#quick-start">
                准备信息
              </a>
              <a className={sidebarLinkClassName} href="#signature">
                签名说明
              </a>
              <a className={sidebarLinkClassName} href="#auth-flow">
                完整流程
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
            桌面客户端激活码接入文档
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#4B5563]">
            推荐按 License v2 接入：后台准备 projectKey 和激活码，客户端生成 machineId 与 Ed25519
            设备密钥，用户输入激活码时 enroll，随后用短期 token 和设备签名调用 status / consume。
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
          <h2 className={docTitleClassName}>先看这 3 件事</h2>
          <p className={docTextClassName}>
            新客户端不用再把 API Secret 放进本地程序。先准备项目和激活码，再让客户端保存稳定
            machineId 与设备私钥，最后按 enroll、challenge、renew、status、consume 五个 v2 接口接入。
            /api/license/* v1 和 /api/verify 只给旧版本兼容。
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
          <h2 className={docTitleClassName}>客户端需要准备什么</h2>
          <p className={docTextClassName}>
            Python 桌面程序通常内置 Base URL 和 projectKey，激活码由用户输入。machineId 和 Ed25519
            私钥首次运行生成后保存在本机，以后一直复用。
          </p>
          <div className="mt-5 overflow-hidden rounded-lg border border-[#E5E7EB]">
            {[
              ['Base URL', 'https://你的域名'],
              ['Content-Type', 'application/json'],
              ['projectKey', '后台项目管理中复制，用来区分不同软件或产品'],
              ['machineId', '客户端本机生成并持久化，不能每次启动变化'],
              ['devicePublicKey', 'Ed25519 公钥，enroll 时提交给服务端'],
              ['device private key', 'Ed25519 私钥，只保存在客户端本机安全存储中'],
              ['licenseToken', '服务端 enroll / renew 下发的短期 token'],
              ['requestId', 'consume 每次业务动作生成一个，重试时复用同一个'],
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
          <h2 className={docTitleClassName}>License v2 签名怎么用</h2>
          <p className={docTextClassName}>
            v2 不把 API Secret 放进客户端。客户端用 Ed25519 设备私钥签名请求，服务端用 enroll
            时登记的设备公钥验证。签名会绑定路径、session、时间戳、nonce、请求体 hash 和 token hash。
          </p>
          <div className="mt-5 overflow-hidden rounded-lg border border-[#E5E7EB]">
            {[
              ['签名算法', 'Ed25519，输出 base64url 字符串'],
              ['签名内容', 'LICENSE-V2-PROOF + POST + 路径 + sessionId + 时间戳 + nonce + bodyHash + tokenHash'],
              ['请求头', 'Authorization / X-License-Session-Id / X-License-Timestamp / X-License-Nonce / X-License-Signature'],
              ['注意', '签名时用的 body 字符串必须和实际发送的 body 完全一致'],
              ['重放防护', '同一个 nonce 只能使用一次，默认时间窗口前后 5 分钟'],
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
            header={<div className="font-semibold text-[#111827]">Python v2 签名核心代码</div>}
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
          <h2 className={docTitleClassName}>完整接入流程</h2>
          <p className={docTextClassName}>
            下面是桌面客户端最常见的接入顺序。照这个流程做，用户换设备、网络重试、次数扣减和后台排查都能对应起来。
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
            License v2 接口共用以下字段。projectKey 用于项目隔离，code 是激活码正文，machineId
            表示设备，devicePublicKey / deviceSignature 用于注册设备，requestId 用于 consume 幂等扣次。
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
          <h2 className={docTitleClassName}>可直接参考的代码</h2>
          <p className={docTextClassName}>
            Python 示例是桌面客户端最小可用接入方式，包含设备密钥、machineId 持久化、token 续租和签名请求。cURL 只用于看请求结构。
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
          <h2 className={docTitleClassName}>后台需要做什么</h2>
          <p className={docTextClassName}>
            客户端不要调用后台接口。后台只负责创建项目、生成激活码、查看 v2 设备和 session、吊销异常设备、封禁客户端版本和查看安全事件。
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
