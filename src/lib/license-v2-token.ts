import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

import { getConfigWithDefault } from './config-service'

const LICENSE_V2_TOKEN_ISSUER = 'activation-manager'
const LICENSE_V2_TOKEN_TYPE = 'license_session'

export type LicenseV2TokenPayload = JWTPayload & {
  typ: typeof LICENSE_V2_TOKEN_TYPE
  projectId: number
  projectKey: string
  activationCodeId: number
  deviceId: number
  sessionId: string
  machineId: string
  tokenVersion: number
  licenseMode: string
  remainingCount?: number | null
}

async function getLicenseTokenSecret() {
  const dedicatedSecret = process.env.LICENSE_V2_TOKEN_SECRET?.trim()
  if (dedicatedSecret) {
    return new TextEncoder().encode(dedicatedSecret)
  }

  const jwtSecret = await getConfigWithDefault('jwtSecret')
  return new TextEncoder().encode(String(jwtSecret))
}

export async function signLicenseV2SessionToken(input: {
  projectId: number
  projectKey: string
  activationCodeId: number
  deviceId: number
  sessionId: string
  machineId: string
  tokenVersion: number
  licenseMode: string
  remainingCount?: number | null
  expiresAt: Date
  jti: string
}) {
  const secret = await getLicenseTokenSecret()

  return new SignJWT({
    typ: LICENSE_V2_TOKEN_TYPE,
    projectId: input.projectId,
    projectKey: input.projectKey,
    activationCodeId: input.activationCodeId,
    deviceId: input.deviceId,
    sessionId: input.sessionId,
    machineId: input.machineId,
    tokenVersion: input.tokenVersion,
    licenseMode: input.licenseMode,
    remainingCount: input.remainingCount ?? null,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'license+jwt' })
    .setIssuer(LICENSE_V2_TOKEN_ISSUER)
    .setAudience(`license:${input.projectKey}`)
    .setIssuedAt()
    .setJti(input.jti)
    .setExpirationTime(Math.floor(input.expiresAt.getTime() / 1000))
    .sign(secret)
}

export async function verifyLicenseV2SessionToken(token: string) {
  const secret = await getLicenseTokenSecret()

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: LICENSE_V2_TOKEN_ISSUER,
    })
    const licensePayload = payload as LicenseV2TokenPayload

    if (licensePayload.typ !== LICENSE_V2_TOKEN_TYPE) {
      return null
    }

    return licensePayload
  } catch {
    return null
  }
}
