import assert from 'node:assert/strict'
import test from 'node:test'

import { NextRequest } from 'next/server'

import * as deleteRouteModule from '../src/app/api/admin/codes/delete/route'
import * as dbModule from '../src/lib/db'
import { clearConfigCache } from '../src/lib/config-service'
import { signToken } from '../src/lib/jwt'

const { prisma } = dbModule
const { DELETE } = deleteRouteModule

async function createAuthCookie() {
  clearConfigCache()
  const token = await signToken({ username: 'admin', isAdmin: true, tokenVersion: 0 })
  return `auth-token=${token}`
}

function createAdminRequest(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init)
}

test('激活码删除接口会清理消费记录和绑定历史，避免外键约束导致 500', async (t) => {
  const originalAllowedIPs = process.env.ALLOWED_IPS
  const originalFindSystemConfig = prisma.systemConfig.findUnique.bind(prisma.systemConfig)
  const originalFindAdmin = prisma.admin.findUnique.bind(prisma.admin)
  const originalTransaction = prisma.$transaction.bind(prisma)
  const calls: string[] = []
  const activationCodeId = 7
  const fakeTx = {
    activationCode: {
      findUnique: async (args: { where: { id: number } }) => {
        calls.push('activationCode.findUnique')
        assert.equal(args.where.id, activationCodeId)

        return {
          id: activationCodeId,
          code: 'USED-CODE-001',
        }
      },
      delete: async (args: { where: { id: number } }) => {
        calls.push('activationCode.delete')
        assert.equal(args.where.id, activationCodeId)

        return {
          id: activationCodeId,
          code: 'USED-CODE-001',
        }
      },
    },
    licenseConsumption: {
      deleteMany: async (args: { where: { activationCodeId: number } }) => {
        calls.push('licenseConsumption.deleteMany')
        assert.equal(args.where.activationCodeId, activationCodeId)

        return {
          count: 1,
        }
      },
    },
    activationCodeBindingHistory: {
      deleteMany: async (args: { where: { activationCodeId: number } }) => {
        calls.push('activationCodeBindingHistory.deleteMany')
        assert.equal(args.where.activationCodeId, activationCodeId)

        return {
          count: 1,
        }
      },
    },
    adminOperationAuditLog: {
      updateMany: async (args: {
        where: { activationCodeId: number }
        data: { activationCodeId: null }
      }) => {
        calls.push('adminOperationAuditLog.updateMany')
        assert.equal(args.where.activationCodeId, activationCodeId)
        assert.deepEqual(args.data, {
          activationCodeId: null,
        })

        return {
          count: 1,
        }
      },
    },
  }

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
        value: 'delete-route-test-secret',
        description: 'JWT密钥',
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
        updatedAt: new Date('2026-04-20T00:00:00.000Z'),
      }
    }

    if (where.key === 'jwtExpiresIn') {
      return {
        id: 2,
        key: 'jwtExpiresIn',
        value: '24h',
        description: 'JWT过期时间',
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
        updatedAt: new Date('2026-04-20T00:00:00.000Z'),
      }
    }

    return null
  }

  ;(
    prisma.admin as typeof prisma.admin & {
      findUnique: typeof prisma.admin.findUnique
    }
  ).findUnique = async () => ({
    tokenVersion: 0,
  } as never)

  ;(
    prisma as unknown as {
      $transaction: (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>
    }
  ).$transaction = async (callback) => callback(fakeTx)

  t.after(async () => {
    if (originalAllowedIPs === undefined) {
      delete process.env.ALLOWED_IPS
    } else {
      process.env.ALLOWED_IPS = originalAllowedIPs
    }

    clearConfigCache()
    ;(
      prisma.systemConfig as typeof prisma.systemConfig & {
        findUnique: typeof prisma.systemConfig.findUnique
      }
    ).findUnique = originalFindSystemConfig
    ;(
      prisma.admin as typeof prisma.admin & {
        findUnique: typeof prisma.admin.findUnique
      }
    ).findUnique = originalFindAdmin
    ;(
      prisma as unknown as {
        $transaction: typeof prisma.$transaction
      }
    ).$transaction = originalTransaction
    await prisma.$disconnect()
  })

  const response = await DELETE(
    createAdminRequest('http://127.0.0.1:3000/api/admin/codes/delete', {
      method: 'DELETE',
      headers: {
        cookie: await createAuthCookie(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: activationCodeId }),
    }),
  )
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(
    {
      success: body.success,
      message: body.message,
    },
    {
      success: true,
      message: '激活码删除成功',
    },
  )
  assert.deepEqual(calls, [
    'activationCode.findUnique',
    'licenseConsumption.deleteMany',
    'activationCodeBindingHistory.deleteMany',
    'adminOperationAuditLog.updateMany',
    'activationCode.delete',
  ])
})
