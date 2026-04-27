import { type NextRequest } from 'next/server'

import { handleConsumeLicenseV2Request } from '@/lib/license-v2-route-handlers'

export async function POST(request: NextRequest) {
  return handleConsumeLicenseV2Request(request)
}
