import { type NextRequest } from 'next/server'

import { handleRevokeLicenseV2SessionRequest } from '@/lib/admin-license-v2-route-handlers'
import { type AdminAuthSuccessResult } from '@/lib/admin-auth-shared'
import { createProtectedAdminRouteHandler } from '@/lib/admin-route-handler'

export const POST = createProtectedAdminRouteHandler(
  async (
    request: NextRequest,
    authResult: AdminAuthSuccessResult,
    context: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await context.params

    return handleRevokeLicenseV2SessionRequest(request, {
      id,
      adminUsername: authResult.payload?.username,
    })
  },
  {
    logLabel: '吊销 License v2 session 失败',
    errorStatus: 400,
    errorMessage: '吊销 License v2 session 失败',
    exposeErrorMessage: true,
  },
)
