import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ApiDocsApifoxWorkspace } from '@/components/api-docs-apifox-workspace'
import { DocsSearchBox } from '@/components/docs-search-box'

export const metadata: Metadata = {
  title: '桌面客户端激活码接入文档',
  description:
    '面向 Python 桌面程序和客户端的激活码接入文档，按后台准备、设备绑定、状态查询和次数扣减说明正式接口。',
}

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-[#FBFCFD] text-[#111827]">
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/94 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1560px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-max items-center gap-2 text-sm font-semibold text-[#111827]">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#111827] text-xs text-white">
              AM
            </span>
            Activation Manager 文档
          </Link>
          <DocsSearchBox />
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="hidden min-h-10 items-center rounded-md border border-[#D8DDE3] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F4F6F8] sm:inline-flex"
            >
              返回首页
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex min-h-10 items-center rounded-md bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#1F2937]"
            >
              登录后台
            </Link>
          </div>
        </div>
        <div className="border-t border-[#EEF1F4]">
          <div className="mx-auto flex max-w-[1560px] gap-6 overflow-x-auto px-4 py-3 text-sm font-semibold text-[#4B5563] sm:px-6 lg:px-8">
            <a className="min-w-max text-[#111827]" href="#overview">
              接入步骤
            </a>
            <a className="min-w-max" href="#quick-start">
              准备信息
            </a>
            <a className="min-w-max" href="#activate">
              三个接口
            </a>
            <a className="min-w-max" href="#sdk-examples">
              Python 示例
            </a>
            <a className="min-w-max" href="#admin-api">
              后台准备
            </a>
          </div>
        </div>
      </header>

      <ApiDocsApifoxWorkspace />
    </main>
  )
}
