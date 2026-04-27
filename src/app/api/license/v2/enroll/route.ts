import { type NextRequest } from 'next/server'

import { handleEnrollLicenseV2Request } from '@/lib/license-v2-route-handlers'

export async function POST(request: NextRequest) {
  return handleEnrollLicenseV2Request(request)
}
