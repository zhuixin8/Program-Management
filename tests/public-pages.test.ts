import assert from 'node:assert/strict'
import test from 'node:test'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

async function loadDefaultComponent(modulePath: string) {
  const mod = await import(modulePath)
  const component = mod.default?.default ?? mod.default

  assert.equal(typeof component, 'function')

  return {
    component: component as React.ComponentType,
    moduleExports: mod.default ?? mod,
  }
}

test('首页会渲染管理后台入口与公开 API 文档入口', async () => {
  const { component: Home } = await loadDefaultComponent('../src/app/page.tsx')
  const html = renderToStaticMarkup(React.createElement(Home))

  assert.equal(html.includes('Activation Manager'), true)
  assert.equal(html.includes('进入管理后台'), true)
  assert.equal(html.includes('使用 API 文档'), true)
  assert.equal(html.includes('项目隔离'), true)
  assert.equal(
    html.includes('inline-flex min-h-10 items-center rounded-md bg-[#111827] px-4 text-sm font-semibold text-white'),
    true,
  )
  assert.equal(
    html.includes('bg-gradient-to-r from-sky-600 via-cyan-500 to-indigo-500'),
    false,
  )
})

test('公开 API 文档页暴露 metadata，并渲染首页与登录入口', async () => {
  const mod = await import('../src/app/docs/api/page.tsx')
  const ApiDocsPage = (mod.default?.default ?? mod.default) as React.ComponentType
  const html = renderToStaticMarkup(React.createElement(ApiDocsPage))
  const metadata = (mod.default?.metadata ?? mod.metadata ?? {}) as {
    title?: string
    description?: string
  }

  assert.equal(metadata.title, '桌面客户端激活码接入文档')
  assert.match(
    metadata.description || '',
    /Python 桌面程序|客户端|正式接口/,
  )
  assert.equal(html.includes('Activation Manager 文档'), true)
  assert.equal(html.includes('登录后台'), true)
  assert.equal(html.includes('返回首页'), true)
  assert.equal(html.includes('接入步骤'), true)
  assert.equal(html.includes('Python 示例'), true)
  assert.equal(
    html.includes('bg-gradient-to-r from-sky-600 via-cyan-500 to-indigo-500'),
    false,
  )
})

test('ApiDocsWorkspace 在 public 模式下会渲染公开文档文案与默认概览内容', async () => {
  const mod = await import('../src/components/api-docs-workspace.tsx')
  const ApiDocsWorkspace =
    (mod.default?.ApiDocsWorkspace ?? mod.ApiDocsWorkspace) as React.ComponentType<{
      mode?: 'dashboard' | 'public'
    }>

  assert.equal(typeof ApiDocsWorkspace, 'function')

  const html = renderToStaticMarkup(React.createElement(ApiDocsWorkspace, { mode: 'public' }))

  assert.equal(html.includes('桌面客户端接入总览'), true)
  assert.equal(html.includes('5 个接口'), true)
  assert.equal(html.includes('License v2 客户端接入流程'), true)
  assert.equal(html.includes('新版 License v2'), true)
  assert.equal(html.includes('Python 和调用示例'), true)
  assert.equal(html.includes('后台准备接口'), true)
  assert.equal(html.includes('bg-slate-900 text-white/90'), false)
  assert.equal(html.includes('bg-gradient-to-b from-white to-slate-50'), false)
})

test('ApiDocsWorkspace 在 dashboard 模式下会渲染后台语境文案', async () => {
  const mod = await import('../src/components/api-docs-workspace.tsx')
  const ApiDocsWorkspace =
    (mod.default?.ApiDocsWorkspace ?? mod.ApiDocsWorkspace) as React.ComponentType<{
      mode?: 'dashboard' | 'public'
    }>

  const html = renderToStaticMarkup(React.createElement(ApiDocsWorkspace, { mode: 'dashboard' }))

  assert.equal(html.includes('API 接入说明'), true)
  assert.equal(html.includes('Python 桌面程序接入说明'), true)
  assert.equal(html.includes('不要把 API Secret 放进客户端'), true)
})
