import crypto from 'crypto'

const ED25519_PUBLIC_KEY_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')
const ED25519_PUBLIC_KEY_BYTES = 32
const ED25519_SIGNATURE_BYTES = 64

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url')
}

export function sha256Hex(value: string | Buffer) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function createLicenseV2RandomId(prefix: string, bytes = 18) {
  return `${prefix}_${crypto.randomBytes(bytes).toString('base64url')}`
}

export function normalizeEd25519PublicKey(publicKey: string) {
  const normalizedPublicKey = publicKey.trim()
  const publicKeyBytes = decodeBase64Url(normalizedPublicKey)

  if (publicKeyBytes.length !== ED25519_PUBLIC_KEY_BYTES) {
    throw new Error('devicePublicKey 必须是 base64url 编码的 32 字节 Ed25519 公钥')
  }

  return publicKeyBytes.toString('base64url')
}

export function getEd25519PublicKeyFingerprint(publicKey: string) {
  return sha256Hex(decodeBase64Url(normalizeEd25519PublicKey(publicKey)))
}

export function verifyEd25519Signature(input: {
  publicKey: string
  signature: string
  message: string
}) {
  try {
    const publicKeyBytes = decodeBase64Url(normalizeEd25519PublicKey(input.publicKey))
    const signatureBytes = decodeBase64Url(input.signature.trim())

    if (signatureBytes.length !== ED25519_SIGNATURE_BYTES) {
      return false
    }

    const keyObject = crypto.createPublicKey({
      key: Buffer.concat([ED25519_PUBLIC_KEY_SPKI_PREFIX, publicKeyBytes]),
      format: 'der',
      type: 'spki',
    })

    return crypto.verify(null, Buffer.from(input.message), keyObject, signatureBytes)
  } catch {
    return false
  }
}

export function buildLicenseV2ChallengeMessage(input: {
  method: string
  path: string
  sessionId: string
  challengeId: string
  nonce: string
}) {
  return [
    'LICENSE-V2-CHALLENGE',
    input.method.toUpperCase(),
    input.path,
    input.sessionId,
    input.challengeId,
    input.nonce,
  ].join('\n')
}

export function buildLicenseV2EnrollMessage(input: {
  method: string
  path: string
  projectKey: string
  code: string
  machineId: string
  appVersion?: string | null
  devicePublicKey: string
  fingerprintHash?: string | null
}) {
  return [
    'LICENSE-V2-ENROLL',
    input.method.toUpperCase(),
    input.path,
    input.projectKey,
    input.code,
    input.machineId,
    input.appVersion ?? '',
    input.devicePublicKey,
    input.fingerprintHash ?? '',
  ].join('\n')
}

export function buildLicenseV2ProofMessage(input: {
  method: string
  path: string
  sessionId: string
  timestamp: string
  nonce: string
  bodyHash: string
  tokenHash: string
}) {
  return [
    'LICENSE-V2-PROOF',
    input.method.toUpperCase(),
    input.path,
    input.sessionId,
    input.timestamp,
    input.nonce,
    input.bodyHash,
    input.tokenHash,
  ].join('\n')
}
