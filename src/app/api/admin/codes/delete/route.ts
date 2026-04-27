import { NextResponse, type NextRequest } from 'next/server'

import { createProtectedAdminRouteHandler } from '@/lib/admin-route-handler'
import { prisma } from '@/lib/db'
import { isPrismaForeignKeyConstraintError } from '@/lib/prisma-error-utils'

export const DELETE = createProtectedAdminRouteHandler(
  async (request: NextRequest) => {
    const { id } = await request.json()
    const activationCodeId = Number.parseInt(String(id), 10)

    if (!id || !Number.isInteger(activationCodeId) || activationCodeId <= 0) {
      return NextResponse.json(
        { success: false, message: '激活码ID不能为空' },
        { status: 400 }
      )
    }

    const deletedCode = await prisma.$transaction(async (tx) => {
      // 检查激活码是否存在
      const existingCode = await tx.activationCode.findUnique({
        where: { id: activationCodeId },
        select: {
          id: true,
          code: true,
        },
      })

      if (!existingCode) {
        return null
      }

      await tx.licenseConsumption.deleteMany({
        where: {
          activationCodeId: existingCode.id,
        },
      })

      await tx.activationCodeBindingHistory.deleteMany({
        where: {
          activationCodeId: existingCode.id,
        },
      })

      await tx.adminOperationAuditLog.updateMany({
        where: {
          activationCodeId: existingCode.id,
        },
        data: {
          activationCodeId: null,
        },
      })

      // 删除激活码
      await tx.activationCode.delete({
        where: { id: existingCode.id },
      })

      return existingCode
    })

    if (!deletedCode) {
      return NextResponse.json(
        { success: false, message: '激活码不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '激活码删除成功',
    })
  },
  {
    logLabel: '删除激活码时发生错误',
    errorStatus: 500,
    errorMessage: '服务器内部错误',
    resolveErrorResponse: (error) => {
      if (!isPrismaForeignKeyConstraintError(error)) {
        return null
      }

      return {
        status: 409,
        message: '激活码仍存在关联记录，删除失败，请刷新后重试',
      }
    },
  },
)
