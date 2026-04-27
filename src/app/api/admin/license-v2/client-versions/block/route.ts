import { type NextRequest } from 'next/server'

import { handleBlockLicenseV2ClientVersionRequest } from '@/lib/admin-license-v2-route-handlers'
import { type AdminAuthSuccessResult } from '@/lib/admin-auth-shared'
import { createProtectedAdminRouteHandler } from '@/lib/admin-route-handler'

export const POST = createProtectedAdminRouteHandler(
  (request: NextRequest, authResult: AdminAuthSuccessResult) =>
    handleBlockLicenseV2ClientVersionRequest(request, {
      adminUsername: authResult.payload?.username,
    }),
  {
    logLabel: '封禁 License v2 客户端版本失败',
    errorStatus: 400,
    errorMessage: '封禁 License v2 客户端版本失败',
    exposeErrorMessage: true,
  },
)
