import { Prisma, PrismaClient } from '@prisma/client'

import { activateLicense, consumeLicense, getLicenseStatus } from './license-service'
import { findProjectActivationCode } from './license-binding-service'
import { resolveProject, type DbClient } from './license-project-service'
import { getRemainingCount } from './license-status'
import { isPrismaUniqueConstraintError } from './prisma-error-utils'
import {
  buildLicenseV2ChallengeMessage,
  buildLicenseV2EnrollMessage,
  buildLicenseV2ProofMessage,
  createLicenseV2RandomId,
  getEd25519PublicKeyFingerprint,
  normalizeEd25519PublicKey,
  sha256Hex,
  verifyEd25519Signature,
} from './license-v2-crypto'
import {
  signLicenseV2SessionToken,
  verifyLicenseV2SessionToken,
  type LicenseV2TokenPayload,
} from './license-v2-token'

type RequestMetadata = {
  ip?: string | null
  userAgent?: string | null
}

type LicenseV2BaseResult = {
  success: boolean
  message: string
  status: number
}

export type LicenseV2Result = LicenseV2BaseResult & Record<string, unknown>

export type LicenseV2EnrollInput = {
  projectKey?: string
  code?: string
  machineId?: string
  devicePublicKey?: string
  deviceSignature?: string
  fingerprintHash?: string | null
  appVersion?: string | null
}

export type LicenseV2ChallengeInput = {
  sessionId?: string
  licenseToken?: string
}

export type LicenseV2RenewInput = {
  sessionId?: string
  challengeId?: string
  nonce?: string
  signature?: string
}

export type LicenseV2ProtectedRequestInput = {
  request: Request
  rawBody: string
  body: Record<string, unknown>
}

const licenseV2SessionInclude = {
  device: {
    include: {
      project: true,
      activationCode: true,
    },
  },
} as const

type LicenseV2SessionRecord = Prisma.LicenseSessionGetPayload<{
  include: typeof licenseV2SessionInclude
}>

const ACTIVE_STATUS = 'ACTIVE'
const REVOKED_STATUS = 'REVOKED'
const CHALLENGE_PURPOSE_RENEW = 'RENEW'
const CHALLENGE_PURPOSE_PROOF = 'PROOF'
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60
const DEFAULT_CHALLENGE_TTL_SECONDS = 5 * 60
const DEFAULT_PROOF_NONCE_TTL_SECONDS = 10 * 60
const DEFAULT_PROOF_MAX_SKEW_SECONDS = 5 * 60
const DEFAULT_CHALLENGE_CLEANUP_RETENTION_SECONDS = 24 * 60 * 60
const DEFAULT_CHALLENGE_CLEANUP_SAMPLE_RATE = 0.01

function normalizeOptionalText(value: unknown) {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''
  return normalizedValue || undefined
}

function normalizeNullableText(value: unknown) {
  return normalizeOptionalText(value) ?? null
}

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  const parsedValue = Number.parseInt(value || '', 10)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function normalizePositiveNumber(value: string | undefined, fallback: number) {
  const parsedValue = Number.parseFloat(value || '')
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function getLicenseV2SessionTtlSeconds() {
  return normalizePositiveInteger(process.env.LICENSE_V2_SESSION_TTL_SECONDS, DEFAULT_SESSION_TTL_SECONDS)
}

function getLicenseV2ChallengeTtlSeconds() {
  return normalizePositiveInteger(
    process.env.LICENSE_V2_CHALLENGE_TTL_SECONDS,
    DEFAULT_CHALLENGE_TTL_SECONDS,
  )
}

function getLicenseV2ProofNonceTtlSeconds() {
  return normalizePositiveInteger(
    process.env.LICENSE_V2_PROOF_NONCE_TTL_SECONDS,
    DEFAULT_PROOF_NONCE_TTL_SECONDS,
  )
}

function getLicenseV2ProofMaxSkewSeconds() {
  return normalizePositiveInteger(
    process.env.LICENSE_V2_PROOF_MAX_SKEW_SECONDS,
    DEFAULT_PROOF_MAX_SKEW_SECONDS,
  )
}

function getLicenseV2ChallengeCleanupRetentionSeconds() {
  return normalizePositiveInteger(
    process.env.LICENSE_V2_CHALLENGE_CLEANUP_RETENTION_SECONDS,
    DEFAULT_CHALLENGE_CLEANUP_RETENTION_SECONDS,
  )
}

function getLicenseV2ChallengeCleanupSampleRate() {
  return normalizePositiveNumber(
    process.env.LICENSE_V2_CHALLENGE_CLEANUP_SAMPLE_RATE,
    DEFAULT_CHALLENGE_CLEANUP_SAMPLE_RATE,
  )
}

function createFailureResult(message: string, status: number): LicenseV2Result {
  return {
    success: false,
    message,
    status,
  }
}

function getSessionExpiresAt(now: Date = new Date()) {
  return new Date(now.getTime() + getLicenseV2SessionTtlSeconds() * 1000)
}

function getChallengeExpiresAt(now: Date = new Date()) {
  return new Date(now.getTime() + getLicenseV2ChallengeTtlSeconds() * 1000)
}

function getProofNonceExpiresAt(now: Date = new Date()) {
  return new Date(now.getTime() + getLicenseV2ProofNonceTtlSeconds() * 1000)
}

async function maybeCleanupOldLicenseV2Challenges(client: DbClient) {
  if (Math.random() >= getLicenseV2ChallengeCleanupSampleRate()) {
    return
  }

  const cutoff = new Date(
    Date.now() - getLicenseV2ChallengeCleanupRetentionSeconds() * 1000,
  )

  await client.licenseChallenge.deleteMany({
    where: {
      expiresAt: {
        lt: cutoff,
      },
    },
  })
}

function extractClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || request.headers.get('x-real-ip') || '127.0.0.1'
}

function getRequestMetadata(request: Request): RequestMetadata {
  return {
    ip: extractClientIp(request),
    userAgent: request.headers.get('user-agent'),
  }
}

function normalizeEnrollInput(input: LicenseV2EnrollInput) {
  return {
    projectKey: normalizeOptionalText(input.projectKey),
    code: normalizeOptionalText(input.code),
    machineId: normalizeOptionalText(input.machineId),
    devicePublicKey: normalizeOptionalText(input.devicePublicKey),
    deviceSignature: normalizeOptionalText(input.deviceSignature),
    fingerprintHash: normalizeNullableText(input.fingerprintHash),
    appVersion: normalizeNullableText(input.appVersion),
  }
}

async function isClientVersionBlocked(
  client: DbClient,
  projectId: number,
  appVersion: string | null,
) {
  if (!appVersion) {
    return false
  }

  const blockedVersion = await client.blockedClientVersion.findUnique({
    where: {
      projectId_appVersion: {
        projectId,
        appVersion,
      },
    },
    select: {
      id: true,
    },
  })

  return Boolean(blockedVersion)
}

export async function recordLicenseV2SecurityEvent(
  client: DbClient,
  input: {
    projectId?: number | null
    activationCodeId?: number | null
    deviceId?: number | null
    licenseSessionId?: number | null
    eventType: string
    severity?: string
    metadata?: RequestMetadata
    detail?: unknown
  },
) {
  if (!('licenseSecurityEvent' in client)) {
    return null
  }

  return client.licenseSecurityEvent.create({
    data: {
      projectId: input.projectId ?? null,
      activationCodeId: input.activationCodeId ?? null,
      deviceId: input.deviceId ?? null,
      licenseSessionId: input.licenseSessionId ?? null,
      eventType: input.eventType,
      severity: input.severity ?? 'INFO',
      ip: input.metadata?.ip?.trim() || null,
      userAgent: input.metadata?.userAgent?.trim() || null,
      detailJson: input.detail === undefined ? null : JSON.stringify(input.detail),
    },
  })
}

function buildSessionTokenInput(session: LicenseV2SessionRecord) {
  return {
    projectId: session.device.projectId,
    projectKey: session.device.project.projectKey,
    activationCodeId: session.device.activationCodeId,
    deviceId: session.device.id,
    sessionId: session.sessionId,
    machineId: session.device.machineId,
    tokenVersion: session.tokenVersion,
    licenseMode: session.device.activationCode.licenseMode,
    remainingCount: getRemainingCount(session.device.activationCode),
    expiresAt: session.expiresAt,
    jti: createLicenseV2RandomId('lt'),
  }
}

async function createSessionSuccessPayload(session: LicenseV2SessionRecord, message: string) {
  const licenseToken = await signLicenseV2SessionToken(buildSessionTokenInput(session))

  return {
    success: true,
    message,
    status: 200,
    tokenType: 'LicenseV2',
    licenseToken,
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
    deviceId: session.device.id,
    licenseMode: session.device.activationCode.licenseMode,
    remainingCount: getRemainingCount(session.device.activationCode),
  }
}

async function loadLicenseV2SessionBySessionId(client: DbClient, sessionId: string) {
  return client.licenseSession.findUnique({
    where: {
      sessionId,
    },
    include: licenseV2SessionInclude,
  })
}

function validateLoadedSession(session: LicenseV2SessionRecord | null, now: Date = new Date()) {
  if (!session) {
    return createFailureResult('License v2 session 不存在', 401)
  }

  if (session.status !== ACTIVE_STATUS || session.revokedAt) {
    return createFailureResult('License v2 session 已失效', 401)
  }

  if (session.expiresAt.getTime() <= now.getTime()) {
    return createFailureResult('License v2 session 已过期', 401)
  }

  if (session.device.status !== ACTIVE_STATUS || session.device.revokedAt) {
    return createFailureResult('License v2 device 已被吊销', 403)
  }

  return null
}

async function loadActiveLicenseV2Session(
  client: DbClient,
  sessionId: string,
  metadata?: RequestMetadata,
) {
  const session = await loadLicenseV2SessionBySessionId(client, sessionId)
  const validationResult = validateLoadedSession(session)
  if (validationResult || !session) {
    return {
      session: null,
      result: validationResult ?? createFailureResult('License v2 session 不存在', 401),
    }
  }

  if (await isClientVersionBlocked(client, session.device.projectId, session.device.appVersion)) {
    await recordLicenseV2SecurityEvent(client, {
      projectId: session.device.projectId,
      activationCodeId: session.device.activationCodeId,
      deviceId: session.device.id,
      licenseSessionId: session.id,
      eventType: 'BLOCKED_CLIENT_VERSION',
      severity: 'WARN',
      metadata,
      detail: {
        appVersion: session.device.appVersion,
      },
    })

    return {
      session: null,
      result: createFailureResult('当前客户端版本已被封禁，请升级后重试', 403),
    }
  }

  return {
    session,
    result: null,
  }
}

function isLicenseV2TokenPayloadBoundToSession(
  tokenPayload: LicenseV2TokenPayload,
  session: LicenseV2SessionRecord,
) {
  return (
    tokenPayload.projectId === session.device.projectId &&
    tokenPayload.projectKey === session.device.project.projectKey &&
    tokenPayload.activationCodeId === session.device.activationCodeId &&
    tokenPayload.deviceId === session.device.id &&
    tokenPayload.tokenVersion === session.tokenVersion &&
    tokenPayload.machineId === session.device.machineId
  )
}

function createLicenseV2TokenMismatchDetail(tokenPayload: LicenseV2TokenPayload) {
  return {
    tokenProjectId: tokenPayload.projectId,
    tokenProjectKey: tokenPayload.projectKey,
    tokenActivationCodeId: tokenPayload.activationCodeId,
    tokenDeviceId: tokenPayload.deviceId,
    tokenVersion: tokenPayload.tokenVersion,
  }
}

async function recordLicenseV2TokenSessionMismatch(
  client: DbClient,
  session: LicenseV2SessionRecord,
  tokenPayload: LicenseV2TokenPayload,
  metadata?: RequestMetadata,
) {
  await recordLicenseV2SecurityEvent(client, {
    projectId: session.device.projectId,
    activationCodeId: session.device.activationCodeId,
    deviceId: session.device.id,
    licenseSessionId: session.id,
    eventType: 'TOKEN_SESSION_MISMATCH',
    severity: 'WARN',
    metadata,
    detail: createLicenseV2TokenMismatchDetail(tokenPayload),
  })
}

export async function enrollLicenseV2Device(
  client: PrismaClient,
  input: LicenseV2EnrollInput,
  metadata?: RequestMetadata,
): Promise<LicenseV2Result> {
  const normalizedInput = normalizeEnrollInput(input)

  if (!normalizedInput.code || !normalizedInput.machineId || !normalizedInput.devicePublicKey) {
    return createFailureResult('激活码、机器ID和设备公钥不能为空', 400)
  }

  if (!normalizedInput.deviceSignature) {
    return createFailureResult('设备签名不能为空', 400)
  }

  const publicKey = normalizeEd25519PublicKey(normalizedInput.devicePublicKey)
  const publicKeyFingerprint = getEd25519PublicKeyFingerprint(publicKey)
  const project = await resolveProject(client, normalizedInput.projectKey)
  const enrollMessage = buildLicenseV2EnrollMessage({
    method: 'POST',
    path: '/api/license/v2/enroll',
    projectKey: project.projectKey,
    code: normalizedInput.code,
    machineId: normalizedInput.machineId,
    appVersion: normalizedInput.appVersion,
    devicePublicKey: publicKey,
    fingerprintHash: normalizedInput.fingerprintHash,
  })

  if (!verifyEd25519Signature({
    publicKey,
    signature: normalizedInput.deviceSignature,
    message: enrollMessage,
  })) {
    await recordLicenseV2SecurityEvent(client, {
      projectId: project.id,
      eventType: 'ENROLL_SIGNATURE_INVALID',
      severity: 'WARN',
      metadata,
      detail: {
        code: normalizedInput.code,
        machineId: normalizedInput.machineId,
        appVersion: normalizedInput.appVersion,
        publicKeyFingerprint,
      },
    })

    return createFailureResult('设备签名无效', 401)
  }

  if (await isClientVersionBlocked(client, project.id, normalizedInput.appVersion)) {
    await recordLicenseV2SecurityEvent(client, {
      projectId: project.id,
      eventType: 'BLOCKED_CLIENT_VERSION',
      severity: 'WARN',
      metadata,
      detail: {
        appVersion: normalizedInput.appVersion,
        code: normalizedInput.code,
        machineId: normalizedInput.machineId,
      },
    })

    return createFailureResult('当前客户端版本已被封禁，请升级后重试', 403)
  }

  const activationResult = await activateLicense(client, {
    projectKey: project.projectKey,
    code: normalizedInput.code,
    machineId: normalizedInput.machineId,
  })

  if (!activationResult.success) {
    await recordLicenseV2SecurityEvent(client, {
      projectId: project.id,
      eventType: 'ENROLL_ACTIVATION_REJECTED',
      severity: 'WARN',
      metadata,
      detail: {
        code: normalizedInput.code,
        machineId: normalizedInput.machineId,
        message: activationResult.message,
      },
    })

    return activationResult
  }

  const activationCode = await findProjectActivationCode(client, project.id, normalizedInput.code)
  if (!activationCode) {
    return createFailureResult('激活码不存在', 404)
  }

  const session = await client.$transaction(async (tx) => {
    const existingDevice = await tx.licenseDevice.findUnique({
      where: {
        projectId_machineId: {
          projectId: project.id,
          machineId: normalizedInput.machineId!,
        },
      },
    })

    if (existingDevice?.status === REVOKED_STATUS || existingDevice?.revokedAt) {
      throw new Error('设备已被吊销，请联系管理员重新授权')
    }

    if (existingDevice && existingDevice.publicKeyFingerprint !== publicKeyFingerprint) {
      throw new Error('当前设备已注册不同公钥，请先在后台吊销旧设备会话')
    }

    const now = new Date()
    const device = existingDevice
      ? await tx.licenseDevice.update({
          where: {
            id: existingDevice.id,
          },
          data: {
            activationCodeId: activationCode.id,
            publicKey,
            publicKeyFingerprint,
            fingerprintHash: normalizedInput.fingerprintHash,
            appVersion: normalizedInput.appVersion,
            status: ACTIVE_STATUS,
            lastSeenAt: now,
          },
        })
      : await tx.licenseDevice.create({
          data: {
            projectId: project.id,
            activationCodeId: activationCode.id,
            machineId: normalizedInput.machineId!,
            publicKey,
            publicKeyFingerprint,
            fingerprintHash: normalizedInput.fingerprintHash,
            appVersion: normalizedInput.appVersion,
            status: ACTIVE_STATUS,
            lastSeenAt: now,
          },
        })

    await tx.licenseSession.updateMany({
      where: {
        deviceId: device.id,
        status: ACTIVE_STATUS,
      },
      data: {
        status: REVOKED_STATUS,
        revokedAt: now,
      },
    })

    return tx.licenseSession.create({
      data: {
        sessionId: createLicenseV2RandomId('ls'),
        deviceId: device.id,
        status: ACTIVE_STATUS,
        expiresAt: getSessionExpiresAt(now),
        lastRenewedAt: now,
      },
      include: licenseV2SessionInclude,
    })
  })

  await recordLicenseV2SecurityEvent(client, {
    projectId: project.id,
    activationCodeId: activationCode.id,
    deviceId: session.device.id,
    licenseSessionId: session.id,
    eventType: 'ENROLL_SUCCEEDED',
    severity: 'INFO',
    metadata,
    detail: {
      machineId: normalizedInput.machineId,
      appVersion: normalizedInput.appVersion,
    },
  })

  return createSessionSuccessPayload(session, 'License v2 设备注册成功')
}

export async function createLicenseV2Challenge(
  client: PrismaClient,
  input: LicenseV2ChallengeInput,
  metadata?: RequestMetadata,
): Promise<LicenseV2Result> {
  const sessionId = normalizeOptionalText(input.sessionId)
  const licenseToken = normalizeOptionalText(input.licenseToken)
  if (!sessionId || !licenseToken) {
    return createFailureResult('sessionId 和 licenseToken 不能为空', 400)
  }

  const tokenPayload = await verifyLicenseV2SessionToken(licenseToken)
  if (!tokenPayload || tokenPayload.sessionId !== sessionId) {
    return createFailureResult('License v2 token 无效或与 sessionId 不匹配', 401)
  }

  const { session, result } = await loadActiveLicenseV2Session(client, tokenPayload.sessionId, metadata)
  if (result || !session) {
    return result ?? createFailureResult('License v2 session 不存在', 401)
  }

  if (!isLicenseV2TokenPayloadBoundToSession(tokenPayload, session)) {
    await recordLicenseV2TokenSessionMismatch(client, session, tokenPayload, metadata)
    return createFailureResult('License v2 token 与会话不匹配', 401)
  }

  const challenge = await client.licenseChallenge.create({
    data: {
      challengeId: createLicenseV2RandomId('lc'),
      deviceId: session.device.id,
      nonce: createLicenseV2RandomId('nonce', 24),
      purpose: CHALLENGE_PURPOSE_RENEW,
      expiresAt: getChallengeExpiresAt(),
    },
  })
  await maybeCleanupOldLicenseV2Challenges(client)

  return {
    success: true,
    message: 'License v2 challenge 创建成功',
    status: 200,
    sessionId: session.sessionId,
    challengeId: challenge.challengeId,
    nonce: challenge.nonce,
    expiresAt: challenge.expiresAt,
    signInput: buildLicenseV2ChallengeMessage({
      method: 'POST',
      path: '/api/license/v2/renew',
      sessionId: session.sessionId,
      challengeId: challenge.challengeId,
      nonce: challenge.nonce,
    }),
  }
}

export async function renewLicenseV2Session(
  client: PrismaClient,
  input: LicenseV2RenewInput,
  metadata?: RequestMetadata,
): Promise<LicenseV2Result> {
  const sessionId = normalizeOptionalText(input.sessionId)
  const challengeId = normalizeOptionalText(input.challengeId)
  const nonce = normalizeOptionalText(input.nonce)
  const signature = normalizeOptionalText(input.signature)

  if (!sessionId || !challengeId || !nonce || !signature) {
    return createFailureResult('sessionId、challengeId、nonce 和 signature 不能为空', 400)
  }

  const { session, result } = await loadActiveLicenseV2Session(client, sessionId, metadata)
  if (result || !session) {
    return result ?? createFailureResult('License v2 session 不存在', 401)
  }

  const challenge = await client.licenseChallenge.findUnique({
    where: {
      challengeId,
    },
  })
  const now = new Date()

  if (
    !challenge ||
    challenge.deviceId !== session.device.id ||
    challenge.purpose !== CHALLENGE_PURPOSE_RENEW ||
    challenge.nonce !== nonce ||
    challenge.usedAt ||
    challenge.expiresAt.getTime() <= now.getTime()
  ) {
    await recordLicenseV2SecurityEvent(client, {
      projectId: session.device.projectId,
      activationCodeId: session.device.activationCodeId,
      deviceId: session.device.id,
      licenseSessionId: session.id,
      eventType: 'CHALLENGE_REJECTED',
      severity: 'WARN',
      metadata,
      detail: {
        challengeId,
        nonce,
      },
    })

    return createFailureResult('License v2 challenge 无效或已过期', 401)
  }

  const message = buildLicenseV2ChallengeMessage({
    method: 'POST',
    path: '/api/license/v2/renew',
    sessionId,
    challengeId,
    nonce,
  })

  if (!verifyEd25519Signature({ publicKey: session.device.publicKey, signature, message })) {
    await recordLicenseV2SecurityEvent(client, {
      projectId: session.device.projectId,
      activationCodeId: session.device.activationCodeId,
      deviceId: session.device.id,
      licenseSessionId: session.id,
      eventType: 'CHALLENGE_SIGNATURE_INVALID',
      severity: 'WARN',
      metadata,
      detail: {
        challengeId,
      },
    })

    return createFailureResult('License v2 challenge 签名无效', 401)
  }

  const updatedSession = await client.$transaction(async (tx) => {
    const challengeUpdate = await tx.licenseChallenge.updateMany({
      where: {
        id: challenge.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    })

    if (challengeUpdate.count === 0) {
      throw new Error('License v2 challenge 已被使用')
    }

    await tx.licenseDevice.update({
      where: {
        id: session.device.id,
      },
      data: {
        lastSeenAt: now,
      },
    })

    return tx.licenseSession.update({
      where: {
        id: session.id,
      },
      data: {
        tokenVersion: {
          increment: 1,
        },
        expiresAt: getSessionExpiresAt(now),
        lastRenewedAt: now,
      },
      include: licenseV2SessionInclude,
    })
  })

  return createSessionSuccessPayload(updatedSession, 'License v2 session 续租成功')
}

function extractBearerToken(request: Request, body: Record<string, unknown>) {
  const authorization = request.headers.get('authorization')?.trim()
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim()
  }

  return normalizeOptionalText(body.licenseToken)
}

function validateProofTimestamp(timestamp: string) {
  const timestampSeconds = Number(timestamp)
  const nowSeconds = Math.floor(Date.now() / 1000)

  return (
    Number.isInteger(timestampSeconds) &&
    Math.abs(nowSeconds - timestampSeconds) <= getLicenseV2ProofMaxSkewSeconds()
  )
}

export async function verifyLicenseV2ProtectedRequest(
  client: PrismaClient,
  input: LicenseV2ProtectedRequestInput,
) {
  const token = extractBearerToken(input.request, input.body)
  if (!token) {
    return {
      ok: false as const,
      result: createFailureResult('License v2 token 不能为空', 401),
    }
  }

  const tokenPayload = await verifyLicenseV2SessionToken(token)
  if (!tokenPayload) {
    return {
      ok: false as const,
      result: createFailureResult('License v2 token 无效', 401),
    }
  }

  const metadata = getRequestMetadata(input.request)
  const { session, result } = await loadActiveLicenseV2Session(
    client,
    tokenPayload.sessionId,
    metadata,
  )

  if (result || !session) {
    return {
      ok: false as const,
      result: result ?? createFailureResult('License v2 session 不存在', 401),
    }
  }

  if (!isLicenseV2TokenPayloadBoundToSession(tokenPayload, session)) {
    await recordLicenseV2TokenSessionMismatch(client, session, tokenPayload, metadata)
    return {
      ok: false as const,
      result: createFailureResult('License v2 token 与会话不匹配', 401),
    }
  }

  const timestamp = input.request.headers.get('x-license-timestamp')?.trim() || ''
  const nonce = input.request.headers.get('x-license-nonce')?.trim() || ''
  const signature = input.request.headers.get('x-license-signature')?.trim() || ''
  const headerSessionId = input.request.headers.get('x-license-session-id')?.trim()

  if (!timestamp || !nonce || !signature) {
    return {
      ok: false as const,
      result: createFailureResult('License v2 请求签名头不能为空', 401),
    }
  }

  if (headerSessionId && headerSessionId !== session.sessionId) {
    return {
      ok: false as const,
      result: createFailureResult('License v2 sessionId 不匹配', 401),
    }
  }

  if (nonce.length > 128 || !validateProofTimestamp(timestamp)) {
    return {
      ok: false as const,
      result: createFailureResult('License v2 请求签名时间或 nonce 无效', 401),
    }
  }

  const path = new URL(input.request.url).pathname
  const proofMessage = buildLicenseV2ProofMessage({
    method: input.request.method,
    path,
    sessionId: session.sessionId,
    timestamp,
    nonce,
    bodyHash: sha256Hex(input.rawBody),
    tokenHash: sha256Hex(token),
  })

  if (!verifyEd25519Signature({ publicKey: session.device.publicKey, signature, message: proofMessage })) {
    await recordLicenseV2SecurityEvent(client, {
      projectId: session.device.projectId,
      activationCodeId: session.device.activationCodeId,
      deviceId: session.device.id,
      licenseSessionId: session.id,
      eventType: 'PROOF_SIGNATURE_INVALID',
      severity: 'WARN',
      metadata,
      detail: {
        path,
      },
    })

    return {
      ok: false as const,
      result: createFailureResult('License v2 请求签名无效', 401),
    }
  }

  try {
    await client.licenseChallenge.create({
      data: {
        challengeId: createLicenseV2RandomId('proof'),
        deviceId: session.device.id,
        nonce,
        purpose: CHALLENGE_PURPOSE_PROOF,
        expiresAt: getProofNonceExpiresAt(),
        usedAt: new Date(),
      },
    })
    await maybeCleanupOldLicenseV2Challenges(client)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error, 'nonce')) {
      await recordLicenseV2SecurityEvent(client, {
        projectId: session.device.projectId,
        activationCodeId: session.device.activationCodeId,
        deviceId: session.device.id,
        licenseSessionId: session.id,
        eventType: 'PROOF_NONCE_REPLAYED',
        severity: 'WARN',
        metadata,
        detail: {
          path,
          nonce,
        },
      })

      return {
        ok: false as const,
        result: createFailureResult('License v2 请求签名 nonce 已使用', 401),
      }
    }

    throw error
  }

  await client.licenseDevice.update({
    where: {
      id: session.device.id,
    },
    data: {
      lastSeenAt: new Date(),
    },
  })

  return {
    ok: true as const,
    session,
    tokenPayload: tokenPayload as LicenseV2TokenPayload,
  }
}

export async function getLicenseV2Status(
  client: PrismaClient,
  session: LicenseV2SessionRecord,
): Promise<LicenseV2Result> {
  const result = await getLicenseStatus(client, {
    projectKey: session.device.project.projectKey,
    code: session.device.activationCode.code,
    machineId: session.device.machineId,
  })

  return {
    ...result,
    sessionId: session.sessionId,
    deviceId: session.device.id,
    tokenExpiresAt: session.expiresAt,
  }
}

export async function consumeLicenseV2(
  client: PrismaClient,
  session: LicenseV2SessionRecord,
  body: Record<string, unknown>,
): Promise<LicenseV2Result> {
  const requestId = normalizeOptionalText(body.requestId ?? body.request_id)
  const result = await consumeLicense(client, {
    projectKey: session.device.project.projectKey,
    code: session.device.activationCode.code,
    machineId: session.device.machineId,
    requestId,
  })

  return {
    ...result,
    sessionId: session.sessionId,
    deviceId: session.device.id,
    tokenExpiresAt: session.expiresAt,
  }
}
