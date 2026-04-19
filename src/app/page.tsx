import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

const primaryButtonClassName =
  'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md bg-[#111827] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_-28px_rgba(17,24,39,0.8)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#1F2937] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]'

const secondaryButtonClassName =
  'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-[#D8DDE3] bg-white px-6 py-3 text-sm font-semibold text-[#111827] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#0F766E]/45 hover:bg-[#F6FBF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]'

const navItems = [
  { label: '产品能力', href: '#capabilities' },
  { label: '接入流程', href: '#workflow' },
  { label: 'API 文档', href: '/docs/api' },
  { label: 'Docker 部署', href: '#deployment' },
]

const heroCapabilities = ['项目隔离', 'TIME / COUNT', '幂等扣次', '审计追踪']

const platformItems = ['Docker 本地部署', '默认数据初始化', 'smoke 联调脚本']

const productRows = [
  ['browser-plugin', 'COUNT', '2,480', 'active'],
  ['desktop-suite', 'TIME', '896', 'active'],
  ['partner-tools', 'COUNT', '1,206', 'paused'],
]

const lifecycleSteps = [
  {
    title: '创建项目',
    text: '为每个产品、插件或客户创建独立 projectKey，隔离发码、绑定和统计口径。',
  },
  {
    title: '生成激活码',
    text: '按 TIME 或 COUNT 模型发码，支持有效期、次数额度和批次管理。',
  },
  {
    title: '客户端接入',
    text: '首次使用调用 activate 绑定 machineId，启动或展示授权信息时调用 status。',
  },
  {
    title: '业务扣次',
    text: '真实业务发生时调用 consume，并用 requestId 避免网络重试造成重复扣次。',
  },
]

const capabilityBlocks = [
  {
    eyebrow: 'License Admin',
    title: '多项目授权空间，统一后台运营',
    text: '每个 projectKey 都有独立的发码空间、启停状态和绑定边界，适合同时维护多个插件、桌面工具或客户项目。',
  },
  {
    eyebrow: 'API Docs',
    title: '接入文档和正式接口一起交付',
    text: '公开文档覆盖 activate、status、consume、verify、字段说明、响应示例和 SDK 用法，接入方可以直接按流程联调。',
  },
  {
    eyebrow: 'Audit Trail',
    title: '消费、绑定和后台操作可追踪',
    text: '消费日志按 requestId、machineId 和项目回查，绑定历史和管理员操作也会留痕，便于联调排障和客户对账。',
  },
]

const featureTabs = [
  {
    title: '激活码运营',
    items: ['批量生成', 'TIME/COUNT', '设备解绑', '过期清理'],
  },
  {
    title: '接入交付',
    items: ['REST 文档', 'SDK 示例', '字段说明', 'smoke 回归'],
  },
  {
    title: '运行审计',
    items: ['消费日志', '趋势统计', '绑定历史', 'CSV 导出'],
  },
]

function ProductWindow() {
  return (
    <div className="mx-auto max-w-6xl overflow-hidden rounded-lg border border-[#D8DDE3] bg-white shadow-[0_36px_120px_-72px_rgba(17,24,39,0.52)]">
      <div className="flex min-h-11 items-center justify-between border-b border-[#E5E7EB] bg-[#F8FAFC] px-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#F97373]" />
          <span className="h-3 w-3 rounded-full bg-[#FBBF24]" />
          <span className="h-3 w-3 rounded-full bg-[#34D399]" />
          <span className="ml-3 hidden text-sm font-semibold text-[#4B5563] sm:inline">
            Activation Manager
          </span>
        </div>
        <div className="rounded-md border border-[#D8DDE3] bg-white px-3 py-1 font-mono text-xs text-[#4B5563]">
          /api/license/consume
        </div>
      </div>

      <div className="grid min-h-[430px] lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden border-r border-[#E5E7EB] bg-[#FBFCFD] p-4 lg:block">
          <div className="text-xs font-semibold text-[#9CA3AF]">WORKSPACE</div>
          <div className="mt-4 space-y-2">
            {['项目概览', '激活码', '消费日志', 'API 文档', '系统配置'].map((item, index) => (
              <div
                key={item}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  index === 1
                    ? 'bg-[#EAFBF4] text-[#047857]'
                    : 'text-[#4B5563]'
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-mono text-xs font-semibold text-[#0F766E]">
                LICENSE OPERATIONS
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                激活码运营面板
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {['active', 'TIME', 'COUNT'].map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-[#D8DDE3] bg-white px-3 py-1 font-mono text-xs font-semibold text-[#4B5563]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {['可用授权 82%', '今日扣次 1,248', '异常请求 12'].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-[#E5E7EB] bg-[#FBFCFD] px-4 py-4 text-sm font-semibold text-[#111827]"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-[#E5E7EB]">
            {productRows.map((row) => (
              <div
                key={row[0]}
                className="grid gap-3 border-b border-[#EEF1F4] px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr]"
              >
                <span className="break-all font-mono text-[#111827]">{row[0]}</span>
                <span className="text-[#4B5563]">{row[1]}</span>
                <span className="text-[#4B5563]">{row[2]}</span>
                <span className={row[3] === 'active' ? 'text-[#047857]' : 'text-[#B45309]'}>
                  {row[3]}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-[#111827] bg-[#0B0F19] p-4">
            <div className="font-mono text-xs leading-6 text-[#D1D5DB]">
              POST /api/license/consume<br />
              requestId: req-20260418-001<br />
              result: idempotent false, remainingCount 24
            </div>
          </div>
        </section>

        <aside className="border-t border-[#E5E7EB] bg-[#FBFCFD] p-4 lg:border-l lg:border-t-0">
          <div className="text-xs font-semibold text-[#9CA3AF]">LIVE RUN</div>
          <div className="mt-4 space-y-3">
            {[
              ['activate', '激活并绑定设备'],
              ['status', '查询授权状态'],
              ['consume', '消费一次额度'],
              ['audit', '按 requestId 回查'],
            ].map(([label, text]) => (
              <div key={label} className="rounded-lg border border-[#E5E7EB] bg-white p-3">
                <div className="font-mono text-xs font-semibold text-[#0F766E]">
                  {label}
                </div>
                <div className="mt-1 text-sm text-[#4B5563]">{text}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FBFCFD] text-[#111827]">
      <section className="relative overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=2200&q=80"
          alt="团队在工作台前进行软件联调"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover opacity-[0.08]"
        />
        <div className="absolute inset-0 bg-white/90" />

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-5 sm:px-6 lg:px-8">
          <header className="flex min-h-14 items-center justify-between gap-4">
            <Link href="/" className="flex min-w-max items-center gap-2 text-sm font-semibold text-[#111827]">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#FF4D6D] text-xs font-semibold text-white">
                AM
              </span>
              Activation Manager
            </Link>
            <nav className="hidden items-center gap-8 text-sm font-semibold text-[#4B5563] lg:flex">
              {navItems.map((item) =>
                item.href.startsWith('/') ? (
                  <Link key={item.label} href={item.href} className="transition hover:text-[#111827]">
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.label} href={item.href} className="transition hover:text-[#111827]">
                    {item.label}
                  </a>
                ),
              )}
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href="/docs/api"
                className="hidden min-h-10 items-center rounded-md border border-[#D8DDE3] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F4F6F8] sm:inline-flex"
              >
                API 文档
              </Link>
              <Link
                href="/admin/login"
                className="inline-flex min-h-10 items-center rounded-md bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#1F2937]"
              >
                登录后台
              </Link>
            </div>
          </header>

          <div className="mx-auto mt-10 max-w-5xl text-center sm:mt-16">
            <Link
              href="/docs/api"
              className="inline-flex min-h-9 items-center rounded-md border border-[#E5E7EB] bg-white/88 px-4 text-sm font-semibold text-[#4B5563] shadow-sm backdrop-blur transition hover:bg-white"
            >
              公告 公开 REST API 文档已更新：activate / status / consume
            </Link>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-[#111827] sm:mt-7 sm:text-6xl lg:text-7xl">
              激活码发放、设备授权、按次消费一体化平台
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-[#4B5563] sm:mt-5">
              面向浏览器插件、桌面工具和多客户产品，提供可部署、可联调、可审计的授权服务。
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-[#374151] sm:mt-8 sm:gap-4">
              {heroCapabilities.map((item) => (
                <span key={item} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white/86 px-4 shadow-sm ring-1 ring-[#E5E7EB]">
                  <span className="h-2 w-2 rounded-full bg-[#0F766E]" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-4 sm:mt-9">
              <Link href="/admin/login" className={primaryButtonClassName}>
                进入管理后台
              </Link>
              <Link href="/docs/api" className={secondaryButtonClassName}>
                使用 API 文档
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm text-[#6B7280]">
              {platformItems.map((item) => (
                <span key={item} className="rounded-md px-3 py-1">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 sm:mt-14">
            <ProductWindow />
          </div>
        </div>
      </section>

      <section id="capabilities" className="border-y border-[#E5E7EB] bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="font-mono text-xs font-semibold text-[#0F766E]">
              ONE LICENSE DATA SOURCE
            </div>
            <h2 className="mt-3 text-4xl font-semibold leading-tight text-[#111827]">
              项目、激活码、接口调用和消费日志使用同一份授权数据
            </h2>
            <p className="mt-4 text-base leading-8 text-[#4B5563]">
              后台发码、客户端验证、公开文档和 smoke 回归围绕同一条授权链路工作，减少口头解释和重复核对。
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {capabilityBlocks.map((item) => (
              <article key={item.title} className="rounded-lg border border-[#E5E7EB] bg-[#FBFCFD] p-6">
                <div className="font-mono text-xs font-semibold text-[#FF4D6D]">
                  {item.eyebrow}
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-[#111827]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#4B5563]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[#FBFCFD] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="font-mono text-xs font-semibold text-[#0F766E]">
              LICENSE LIFECYCLE
            </div>
            <h2 className="mt-3 text-4xl font-semibold leading-tight text-[#111827]">
              从发码到扣次，接入方和后台看到同一条授权链路
            </h2>
            <p className="mt-4 text-base leading-8 text-[#4B5563]">
              运营人员负责项目和发码，客户端接入 REST API，测试同学用 requestId 回查日志，问题定位不再依赖截图和口头描述。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {lifecycleSteps.map((step, index) => (
              <article key={step.title} className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-[0_20px_64px_-56px_rgba(17,24,39,0.35)]">
                <div className="font-mono text-xs font-semibold text-[#0F766E]">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-3 text-xl font-semibold text-[#111827]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#4B5563]">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <div className="font-mono text-xs font-semibold text-[#0F766E]">
                PRODUCT MODULES
              </div>
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-[#111827]">
                按运营、接入、审计拆分能力，交付时不用反复解释接口
              </h2>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {featureTabs.map((group) => (
                  <div key={group.title} className="rounded-lg border border-[#E5E7EB] bg-[#FBFCFD] p-5">
                    <h3 className="text-lg font-semibold text-[#111827]">
                      {group.title}
                    </h3>
                    <div className="mt-4 space-y-2">
                      {group.items.map((item) => (
                        <div key={item} className="rounded-md bg-white px-3 py-2 text-sm text-[#4B5563] ring-1 ring-[#EEF1F4]">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div id="deployment" className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#111827] text-white shadow-[0_36px_100px_-70px_rgba(17,24,39,0.85)]">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="font-mono text-xs text-[#5EEAD4]">LOCAL DEPLOYMENT</div>
                <h3 className="mt-2 text-2xl font-semibold">Windows + Docker Desktop 本地运行</h3>
              </div>
              <div className="space-y-3 p-5 font-mono text-sm leading-7 text-[#D1D5DB]">
                <div>docker compose up -d</div>
                <div>http://127.0.0.1:3001</div>
                <div>GET /docs/api</div>
                <div>POST /api/license/activate</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
