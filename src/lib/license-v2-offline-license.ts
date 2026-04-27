import crypto from 'crypto'

const ED25519_PUBLIC_KEY_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')
const LICENSE_V2_OFFLINE_LICENSE_PREFIX = 'amlic2'
const LICENSE_V2_OFFLINE_LICENSE_TYPE = 'activation-manager.offline-license.v2'

export type LicenseV2OfflineLicensePayload = {
  type: typeof LICENSE_V2_OFFLINE_LICENSE_TYPE
  version: 1
  issuedAt: string
  notBefore: string
  expiresAt: string
  projectKey: string
  activationCodeId: number
  deviceId: number
  sessionId: string
  machineId: string
  publicKeyFingerprint: string
  appVersion: string | null
  tokenVersion: number
  licenseMode: string
  licenseExpiresAt: string | null
  remainingCount: number | null
  valid: boolean
}

export type LicenseV2OfflineLicense = {
  license: string
  payload: LicenseV2OfflineLicensePayload
  publicKey: string
}

function decodeBase64UrlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T
}

function normalizePem(value: string) {
  return value.replace(/\\n/g, '\n')
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(',')}}`
}

function getOfflinePrivateKey() {
  const privateKeyPem = process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_PEM?.trim()
  if (privateKeyPem) {
    return crypto.createPrivateKey(normalizePem(privateKeyPem))
  }

  const privateKeyDerBase64 = process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64?.trim()
  if (privateKeyDerBase64) {
    return crypto.createPrivateKey({
      key: Buffer.from(privateKeyDerBase64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    })
  }

  return null
}

function createEd25519PublicKeyFromRaw(publicKey: string) {
  return crypto.createPublicKey({
    key: Buffer.concat([
      ED25519_PUBLIC_KEY_SPKI_PREFIX,
      Buffer.from(publicKey.trim(), 'base64url'),
    ]),
    format: 'der',
    type: 'spki',
  })
}

export function getLicenseV2OfflinePublicKey() {
  const configuredPublicKey = process.env.LICENSE_V2_OFFLINE_PUBLIC_KEY?.trim()
  if (configuredPublicKey) {
    return configuredPublicKey
  }

  const privateKey = getOfflinePrivateKey()
  if (!privateKey) {
    return null
  }

  const publicKeyDer = crypto
    .createPublicKey(privateKey)
    .export({ format: 'der', type: 'spki' }) as Buffer

  return publicKeyDer.subarray(-32).toString('base64url')
}

export function buildLicenseV2OfflineLicensePayload(
  input: Omit<LicenseV2OfflineLicensePayload, 'type' | 'version'>,
): LicenseV2OfflineLicensePayload {
  return {
    type: LICENSE_V2_OFFLINE_LICENSE_TYPE,
    version: 1,
    ...input,
  }
}

export function signLicenseV2OfflineLicense(
  payload: LicenseV2OfflineLicensePayload,
): LicenseV2OfflineLicense | null {
  const privateKey = getOfflinePrivateKey()
  const publicKey = getLicenseV2OfflinePublicKey()
  if (!privateKey || !publicKey) {
    return null
  }

  const payloadBase64 = Buffer.from(stableStringify(payload)).toString('base64url')
  const signature = crypto.sign(null, Buffer.from(payloadBase64), privateKey).toString('base64url')

  return {
    license: `${LICENSE_V2_OFFLINE_LICENSE_PREFIX}.${payloadBase64}.${signature}`,
    payload,
    publicKey,
  }
}

export function verifyLicenseV2OfflineLicense(input: {
  license: string
  publicKey: string
  now?: Date
}) {
  const [prefix, payloadBase64, signature] = input.license.split('.')
  if (prefix !== LICENSE_V2_OFFLINE_LICENSE_PREFIX || !payloadBase64 || !signature) {
    return null
  }

  const publicKey = createEd25519PublicKeyFromRaw(input.publicKey)
  const ok = crypto.verify(
    null,
    Buffer.from(payloadBase64),
    publicKey,
    Buffer.from(signature, 'base64url'),
  )
  if (!ok) {
    return null
  }

  const payload = decodeBase64UrlJson<LicenseV2OfflineLicensePayload>(payloadBase64)
  if (payload.type !== LICENSE_V2_OFFLINE_LICENSE_TYPE || payload.version !== 1) {
    return null
  }

  const now = input.now ?? new Date()
  if (
    new Date(payload.notBefore).getTime() > now.getTime() ||
    new Date(payload.expiresAt).getTime() <= now.getTime()
  ) {
    return null
  }

  return payload
}
