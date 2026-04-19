import { type NextRequest } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth-service'
import { createAuthResponse } from '@/lib/auth-middleware'
import { handleAdminLoginRequest } from '@/lib/admin-login-route-handler'

export async function POST(request: NextRequest) {
  const authResult = await authorizeAdminRequest(request, { mode: 'public' })
  if (!authResult.success) {
    return createAuthResponse(authResult)
  }

  return handleAdminLoginRequest(request)
}
