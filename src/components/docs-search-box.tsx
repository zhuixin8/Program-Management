'use client'

import React, { useState } from 'react'

const searchTargets = [
  { hash: '#overview', terms: ['overview', '概览', '接口概览', 'api'] },
  { hash: '#quick-start', terms: ['quick', 'start', '快速', 'base url', '接入'] },
  { hash: '#activate', terms: ['activate', '激活', '激活接口'] },
  { hash: '#status', terms: ['status', '状态', '状态接口'] },
  { hash: '#consume', terms: ['consume', '扣次', '消费', 'requestid'] },
  { hash: '#verify', terms: ['verify', '兼容', '验证', '旧接口'] },
  { hash: '#auth-flow', terms: ['flow', '流程', '授权流程', 'activate status consume'] },
  { hash: '#request-fields', terms: ['request', '请求', '参数', '字段'] },
  { hash: '#response-fields', terms: ['response', '响应', '返回', '结构'] },
  { hash: '#sdk-examples', terms: ['sdk', 'curl', 'python', '示例', '调用'] },
  { hash: '#admin-api', terms: ['admin', '后台', '管理接口', '联调'] },
]

export function DocsSearchBox() {
  const [query, setQuery] = useState('')
  const [hint, setHint] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      setHint('请输入接口名、字段或章节名')
      return
    }

    const target = searchTargets.find((item) =>
      item.terms.some((term) => {
        const normalizedTerm = term.toLowerCase()
        return (
          normalizedTerm.includes(normalizedQuery) ||
          normalizedQuery.includes(normalizedTerm)
        )
      }),
    )

    if (!target) {
      setHint('没有找到匹配章节')
      return
    }

    setHint('')
    window.location.hash = target.hash
  }

  return (
    <form className="relative hidden flex-1 md:block" onSubmit={handleSubmit}>
      <label>
        <span className="sr-only">搜索文档</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setHint('')
          }}
          placeholder="搜索文档、接口或字段"
          className="h-10 w-full rounded-lg border border-[#D8DDE3] bg-[#F6F8FA] px-4 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0F766E] focus:bg-white"
        />
      </label>
      {hint && (
        <div className="absolute left-0 top-12 z-50 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#4B5563] shadow-lg">
          {hint}
        </div>
      )}
    </form>
  )
}
