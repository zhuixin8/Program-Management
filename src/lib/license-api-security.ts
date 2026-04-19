import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { Prisma, type PrismaClient } from '@prisma/client'

import { DEFAULT_PROJECT_KEY } from './dev-bootstrap'
import type { LicenseApiRequestParams } from './license-api'

type LicenseApiSecurityClient = Pick<
  PrismaClient,
  'project' | 'licenseApiRateLimitState' | 'licenseApiNonce'
>

type ParsedLicenseApiRequest = {
  params: LicenseApiRequestParams
  rawBody: string
}

type SecurityGateResult =
  | {
      ok: true
    }
  | {
      ok: false
      response: NextResponse
    }

const DEFAULT_RATE_LIMIT_MAX = 120
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60
const SIGNATURE_MAX_SKEW_SECONDS = 5 * 60
const NONCE_RETENTION_SECONDS = 10 * 60

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  const parsedValue = Number.parseInt(value || '', 10)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function getRateLimitMax() {
  return normalizePositiveInteger(process.env.LICENSE_API_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX)
}

function getRateLimitWindowSeconds() {
  return normalizePositiveInteger(
    process.env.LICENSE_API_RATE_LIMIT_WINDOW_SECONDS,
    DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
  )
}

function createFailureResponse(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
      headers,
    },
  )
}

function extractClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || request.headers.get('x-real-ip') || '127.0.0.1'
}

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function normalizeSignature(signature: string) {
  return signature.startsWith('sha256=') ? signature.slice('sha256='.length) : signature
}

function safeEqualHex(left: string, right: string) {
  const normalizedLeft = normalizeSignature(left).trim().toLowerCase()
  const normalizedRight = normalizeSignature(right).trim().toLowerCase()

  if (!/^[a-f0-9]{64}$/.test(normalizedLeft) || !/^[a-f0-9]{64}$/.test(normalizedRight)) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(normalizedLeft, 'hex'),
    Buffer.from(normalizedRight, 'hex'),
  )
}

function buildCanonicalSignatureInput(request: Request, parsedRequest: ParsedLicenseApiRequest, input: {
  timestamp: string
  nonce: string
}) {
  const url = new URL(request.url)

  return [
    request.method.toUpperCase(),
    url.pathname,
    input.timestamp,
    input.nonce,
    sha256Hex(parsedRequest.rawBody),
  ].join('\n')
}

function signCanonicalInput(secret: string, canonicalInput: string) {
  return crypto.createHmac('sha256', secret).update(canonicalInput).digest('hex')
}

async function cleanupOldNonces(client: LicenseApiSecurityClient) {
  const cutoff = new Date(Date.now() - NONCE_RETENTION_SECONDS * 1000)

  await client.licenseApiNonce.deleteMany({
    where: {
      createdAt: {
        lt: cutoff,
      },
    },
  })
}

export async function enforceLicenseApiRateLimit(
  client: LicenseApiSecurityClient,
  request: Request,
  params: LicenseApiRequestParams,
): Promise<SecurityGateResult> {
  const maxRequests = getRateLimitMax()
  if (maxRequests <= 0) {
    return { ok: true }
  }

  const windowSeconds = getRateLimitWindowSeconds()
  const now = new Date()
  const key = [
    'license-api',
    extractClientIp(request),
    params.projectKey || DEFAULT_PROJECT_KEY,
    new URL(request.url).pathname,
  ].join(':')
  const existingState = await client.licenseApiRateLimitState.findUnique({
    where: { key },
  })

  if (
    !existingState ||
    now.getTime() - existingState.windowStartedAt.getTime() >= windowSeconds * 1000
  ) {
    await client.licenseApiRateLimitState.upsert({
      where: { key },
      update: {
        count: 1,
        windowStartedAt: now,
      },
      create: {
        key,
        count: 1,
        windowStartedAt: now,
      },
    })

    return { ok: true }
  }

  if (existingState.count >= maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (existingState.windowStartedAt.getTime() + windowSeconds * 1000 - now.getTime()) / 1000,
      ),
    )

    return {
      ok: false,
      response: createFailureResponse('License API rate limit exceeded', 429, {
        'Retry-After': String(retryAfterSeconds),
      }),
    }
  }

  await client.licenseApiRateLimitState.update({
    where: { key },
    data: {
      count: {
        increment: 1,
      },
    },
  })

  return { ok: true }
}

export async function verifyProjectLicenseApiSignature(
  client: LicenseApiSecurityClient,
  request: Request,
  parsedRequest: ParsedLicenseApiRequest,
): Promise<SecurityGateResult> {
  const projectKey = parsedRequest.params.projectKey || DEFAULT_PROJECT_KEY
  const project = await client.project.findUnique({
    where: {
      projectKey,
    },
    select: {
      id: true,
      isEnabled: true,
      apiSecret: true,
    },
  })

  if (!project) {
    return {
      ok: false,
      response: createFailureResponse(`Project not found: ${projectKey}`, 400),
    }
  }

  if (!project.isEnabled) {
    return {
      ok: false,
      response: createFailureResponse(`Project disabled: ${projectKey}`, 400),
    }
  }

  const apiSecret = project.apiSecret?.trim()
  if (!apiSecret) {
    return { ok: true }
  }

  const timestamp = request.headers.get('x-license-timestamp')?.trim() || ''
  const nonce = request.headers.get('x-license-nonce')?.trim() || ''
  const signature = request.headers.get('x-license-signature')?.trim() || ''

  if (!timestamp || !nonce || !signature) {
    return {
      ok: false,
      response: createFailureResponse('License API signature headers are required', 401),
    }
  }

  if (nonce.length > 128) {
    return {
      ok: false,
      response: createFailureResponse('License API nonce is too long', 401),
    }
  }

  const timestampSeconds = Number(timestamp)
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (
    !Number.isInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > SIGNATURE_MAX_SKEW_SECONDS
  ) {
    return {
      ok: false,
      response: createFailureResponse('License API signature timestamp is invalid', 401),
    }
  }

  const canonicalInput = buildCanonicalSignatureInput(request, parsedRequest, {
    timestamp,
    nonce,
  })
  const expectedSignature = signCanonicalInput(apiSecret, canonicalInput)

  if (!safeEqualHex(signature, expectedSignature)) {
    return {
      ok: false,
      response: createFailureResponse('License API signature is invalid', 401),
    }
  }

  try {
    await client.licenseApiNonce.create({
      data: {
        projectId: project.id,
        nonce,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        ok: false,
        response: createFailureResponse('License API nonce has already been used', 401),
      }
    }

    throw error
  }

  if (Math.random() < 0.01) {
    await cleanupOldNonces(client)
  }

  return { ok: true }
}
