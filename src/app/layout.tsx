import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Activation Manager',
    template: '%s | Activation Manager',
  },
  description:
    '面向插件和桌面客户端的激活码授权运营平台，支持 projectKey 项目隔离、TIME/COUNT 授权、REST API 接入和消费日志审计。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
