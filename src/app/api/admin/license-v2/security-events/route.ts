import { type NextRequest } from 'next/server'

import { handleListLicenseV2SecurityEventsRequest } from '@/lib/admin-license-v2-route-handlers'
import { createProtectedAdminRouteHandler } from '@/lib/admin-route-handler'

export const GET = createProtectedAdminRouteHandler(
  (request: NextRequest) => handleListLicenseV2SecurityEventsRequest(request),
  {
    logLabel: '获取 License v2 安全事件失败',
    errorStatus: 400,
    errorMessage: '获取 License v2 安全事件失败',
    exposeErrorMessage: true,
  },
)
