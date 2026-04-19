'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const inputClassName =
  'mt-2 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'

const primaryButtonClassName =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60'

const secondaryLinkClassName =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50'

const loginHighlights = [
  {
    label: '项目隔离',
    value: 'Project Key',
    description: '每个产品线使用独立标识、启停状态和接入边界。',
  },
  {
    label: '授权模型',
    value: 'TIME / COUNT',
    description: '时间卡与次数卡并行管理，适配订阅、试用和扣次场景。',
  },
  {
    label: '追踪闭环',
    value: 'Request ID',
    description: '从激活、查询、扣次到审计日志，都能回到同一条链路。',
  },
]

const assuranceItems = [
  '进入后台后可集中处理项目、发码、激活码状态、消费日志和系统配置。',
  'API 文档可直接交给插件端、客户端或测试同学，用同一套字段完成联调。',
  '建议先确认 projectKey 与授权模型，再批量生成正式激活码。',
]

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/admin/dashboard')
      } else {
        setError(data.message || '登录失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7f8] px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col">
        <header className="flex min-h-14 items-center justify-between gap-4">
          <Link href="/" className="flex min-h-11 items-center gap-3 rounded-lg px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-sm font-semibold text-white">
              AM
            </span>
            <span>
              <span className="block text-sm font-semibold text-zinc-950">Activation Manager</span>
              <span className="block text-xs text-zinc-500">Admin Console</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/docs/api" className={secondaryLinkClassName}>
              API 文档
            </Link>
            <Link href="/" className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-950 sm:inline-flex">
              返回首页
            </Link>
          </div>
        </header>

        <section className="mt-4 grid flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_24px_80px_-56px_rgba(39,39,42,0.45)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative flex min-h-[520px] flex-col justify-between overflow-hidden bg-zinc-950 p-6 text-white sm:p-8 lg:p-10">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-45"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80')",
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.96)_0%,rgba(9,9,11,0.78)_48%,rgba(9,9,11,0.5)_100%)]" />

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                <span className="h-2 w-2 rounded-lg bg-emerald-300" />
                授权运营控制台
              </div>
              <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                面向激活码业务的安全管理入口
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-200">
                登录后集中管理项目、发码、授权状态、扣次记录和审计日志，确保客户端接入、后台运营与故障排查使用同一套数据源。
              </p>
            </div>

            <div className="relative z-10 mt-10 grid gap-3 md:grid-cols-3">
              {loginHighlights.map((item) => (
                <div key={item.label} className="rounded-lg border border-white/12 bg-black/30 p-4 backdrop-blur">
                  <div className="text-xs font-semibold text-emerald-100">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
            <div className="w-full max-w-md">
              <div className="rounded-lg border border-zinc-200 bg-[#fbfcfd] p-5">
                <div className="text-sm font-semibold text-emerald-700">管理员登录</div>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-zinc-950">
                  使用后台账号继续
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-500">
                  凭证验证通过后进入 SaaS 控制台。请使用初始化脚本或系统配置中维护的管理员账号。
                </p>

                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  <div>
                    <label htmlFor="username" className="block text-sm font-semibold text-zinc-800">
                      用户名
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={inputClassName}
                      placeholder="请输入管理员用户名"
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-zinc-800">
                      密码
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClassName}
                      placeholder="请输入登录密码"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className={`w-full ${primaryButtonClassName}`}>
                    {loading ? '登录中...' : '进入管理后台'}
                  </button>
                </form>
              </div>

              <div className="mt-5 space-y-3">
                {assuranceItems.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-700">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-zinc-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
