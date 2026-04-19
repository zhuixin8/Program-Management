import assert from 'node:assert/strict'
import test from 'node:test'

import { NextRequest } from 'next/server'

import * as cleanupRouteModule from '../src/app/api/admin/codes/cleanup/route'
import * as dbModule from '../src/lib/db'
import { signToken } from '../src/lib/jwt'

const { prisma } = dbModule
const { POST } = cleanupRouteModule

async function createAuthCookie() {
  const token = await signToken({ username: 'admin', isAdmin: true })
  return `auth-token=${token}`
}

function createAdminRequest(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init)
}

test('清理过期绑定只释放 machineId，不重置过期激活码生命周期字段', async (t) => {
  const originalAllowedIPs = process.env.ALLOWED_IPS
  const originalFindSystemConfig = prisma.systemConfig.findUnique.bind(prisma.systemConfig)
  const originalFindMany = prisma.activationCode.findMany.bind(prisma.activationCode)
  const originalUpdateMany = prisma.activationCode.updateMany.bind(prisma.activationCode)
  const usedAt = new Date('2000-01-01T00:00:00.000Z')
  const updateManyCalls: Array<Record<string, unknown>> = []

  process.env.ALLOWED_IPS = '*'

  ;(
    prisma.systemConfig as typeof prisma.systemConfig & {
      findUnique: typeof prisma.systemConfig.findUnique
    }
  ).findUnique = async ({ where }: { where: { key: string } }) => {
    if (where.key === 'jwtSecret') {
      return {
        id: 1,
        key: 'jwtSecret',
        value: 'cleanup-route-test-secret',
        description: 'JWT密钥',
        createdAt: new Date('2026-03-24T00:00:00.000Z'),
        updatedAt: new Date('2026-03-24T00:00:00.000Z'),
      }
    }

    if (where.key === 'jwtExpiresIn') {
      return {
        id: 2,
        key: 'jwtExpiresIn',
        value: '24h',
        description: 'JWT过期时间',
        createdAt: new Date('2026-03-24T00:00:00.000Z'),
        updatedAt: new Date('2026-03-24T00:00:00.000Z'),
      }
    }

    return null
  }

  ;(
    prisma.activationCode as typeof prisma.activationCode & {
      findMany: typeof prisma.activationCode.findMany
    }
  ).findMany = async () => ([
    {
      id: 1,
      code: 'EXPIRED-CODE-001',
      isUsed: true,
      usedAt,
      usedBy: 'expired-machine',
      createdAt: usedAt,
      expiresAt: null,
      validDays: 1,
      licenseMode: 'TIME',
    },
  ] as never)

  ;(
    prisma.activationCode as typeof prisma.activationCode & {
      updateMany: typeof prisma.activationCode.updateMany
    }
  ).updateMany = async (args: Record<string, unknown>) => {
    updateManyCalls.push(args)
    return { count: 1 } as never
  }

  t.after(async () => {
    if (originalAllowedIPs === undefined) {
      delete process.env.ALLOWED_IPS
    } else {
      process.env.ALLOWED_IPS = originalAllowedIPs
    }

    ;(
      prisma.systemConfig as typeof prisma.systemConfig & {
        findUnique: typeof prisma.systemConfig.findUnique
      }
    ).findUnique = originalFindSystemConfig
    ;(
      prisma.activationCode as typeof prisma.activationCode & {
        findMany: typeof prisma.activationCode.findMany
      }
    ).findMany = originalFindMany
    ;(
      prisma.activationCode as typeof prisma.activationCode & {
        updateMany: typeof prisma.activationCode.updateMany
      }
    ).updateMany = originalUpdateMany
    await prisma.$disconnect()
  })

  const response = await POST(
    createAdminRequest('http://127.0.0.1:3000/api/admin/codes/cleanup', {
      method: 'POST',
      headers: {
        cookie: await createAuthCookie(),
      },
    }),
  )
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.cleaned, 1)
  assert.equal(updateManyCalls.length, 1)
  assert.deepEqual(updateManyCalls[0]?.data, {
    usedBy: null,
  })
})
