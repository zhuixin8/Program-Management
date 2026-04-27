import { type NextRequest } from 'next/server'

import { handleCreateLicenseV2ChallengeRequest } from '@/lib/license-v2-route-handlers'

export async function POST(request: NextRequest) {
  return handleCreateLicenseV2ChallengeRequest(request)
}
