import { type NextRequest } from 'next/server'

import { handleRenewLicenseV2SessionRequest } from '@/lib/license-v2-route-handlers'

export async function POST(request: NextRequest) {
  return handleRenewLicenseV2SessionRequest(request)
}
