import { type NextRequest } from 'next/server'

import { handleLicenseV2StatusRequest } from '@/lib/license-v2-route-handlers'

export async function POST(request: NextRequest) {
  return handleLicenseV2StatusRequest(request)
}
