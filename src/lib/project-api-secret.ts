import crypto from 'crypto'

export const PROJECT_API_SECRET_BYTES = 32

export function generateProjectApiSecret() {
  return crypto.randomBytes(PROJECT_API_SECRET_BYTES).toString('hex')
}
