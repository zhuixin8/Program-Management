import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'

import { prisma } from './db'
import {
  consumeLicenseV2,
  createLicenseV2Challenge,
  enrollLicenseV2Device,
  getLicenseV2Status,
  renewLicenseV2Session,
  verifyLicenseV2ProtectedRequest,
  type LicenseV2Result,
} from './license-v2-service'

type ParsedJsonRequest = {
  rawBody: string
  body: Record<string, unknown>
}

const DEFAULT_LICENSE_V2_RATE_LIMIT_MAX = 180
const DEFAULT_LICENSE_V2_RATE_LIMIT_WINDOW_SECONDS = 60

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  const parsedValue = Number.parseInt(value || '', 10)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function getLicenseV2RateLimitMax() {
  return normalizePositiveInteger(
    process.env.LICENSE_V2_RATE_LIMIT_MAX,
    DEFAULT_LICENSE_V2_RATE_LIMIT_MAX,
  )
}

function getLicenseV2RateLimitWindowSeconds() {
  return normalizePositiveInteger(
    process.env.LICENSE_V2_RATE_LIMIT_WINDOW_SECONDS,
    DEFAULT_LICENSE_V2_RATE_LIMIT_WINDOW_SECONDS,
  )
}

async function readJsonRequest(request: Request): Promise<ParsedJsonRequest> {
  const rawBody = await request.text()
  const parsedBody = rawBody ? JSON.parse(rawBody) : {}

  return {
    rawBody,
    body:
      typeof parsedBody === 'object' && parsedBody !== null && !Array.isArray(parsedBody)
        ? parsedBody as Record<string, unknown>
        : {},
  }
}

function createLicenseV2JsonResponse(result: LicenseV2Result) {
  const { status, ...payload } = result
  return NextResponse.json(payload, { status })
}

function createUnexpectedErrorResponse(label: string, error: unknown) {
  console.error(`${label}:`, error)

  return NextResponse.json(
    {
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误',
    },
    {
      status: error instanceof Error ? 400 : 500,
    },
  )
}

function getRequestMetadata(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()

  return {
    ip: forwardedFor || request.headers.get('x-real-ip') || '127.0.0.1',
    userAgent: request.headers.get('user-agent'),
  }
}

function normalizeOptionalText(value: unknown) {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''
  return normalizedValue || undefined
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization')?.trim()
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return undefined
  }

  return authorization.slice('bearer '.length).trim() || undefined
}

function withBearerToken(request: Request, body: Record<string, unknown>) {
  const bearerToken = getBearerToken(request)
  return bearerToken ? { ...body, licenseToken: bearerToken } : body
}

async function enforceLicenseV2RouteRateLimit(
  client: PrismaClient,
  request: Request,
  body: Record<string, unknown>,
) {
  const maxRequests = getLicenseV2RateLimitMax()
  if (maxRequests <= 0) {
    return null
  }

  const windowSeconds = getLicenseV2RateLimitWindowSeconds()
  const now = new Date()
  const path = new URL(request.url).pathname
  const routeIdentity =
    normalizeOptionalText(body.projectKey) ||
    normalizeOptionalText(body.sessionId) ||
    request.headers.get('x-license-session-id')?.trim() ||
    'anonymous'
  const key = [
    'license-v2',
    getRequestMetadata(request).ip,
    path,
    routeIdentity,
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

    return null
  }

  if (existingState.count >= maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (existingState.windowStartedAt.getTime() + windowSeconds * 1000 - now.getTime()) / 1000,
      ),
    )

    return NextResponse.json(
      {
        success: false,
        message: 'License v2 rate limit exceeded',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      },
    )
  }

  await client.licenseApiRateLimitState.update({
    where: { key },
    data: {
      count: {
        increment: 1,
      },
    },
  })

  return null
}

export async function handleEnrollLicenseV2Request(
  request: Request,
  client: PrismaClient = prisma,
) {
  try {
    const { body } = await readJsonRequest(request)
    const rateLimitResponse = await enforceLicenseV2RouteRateLimit(client, request, body)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    return createLicenseV2JsonResponse(
      await enrollLicenseV2Device(client, body, getRequestMetadata(request)),
    )
  } catch (error) {
    return createUnexpectedErrorResponse('License v2 设备注册失败', error)
  }
}

export async function handleCreateLicenseV2ChallengeRequest(
  request: Request,
  client: PrismaClient = prisma,
) {
  try {
    const { body } = await readJsonRequest(request)
    const rateLimitResponse = await enforceLicenseV2RouteRateLimit(client, request, body)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    return createLicenseV2JsonResponse(
      await createLicenseV2Challenge(client, withBearerToken(request, body), getRequestMetadata(request)),
    )
  } catch (error) {
    return createUnexpectedErrorResponse('License v2 challenge 创建失败', error)
  }
}

export async function handleRenewLicenseV2SessionRequest(
  request: Request,
  client: PrismaClient = prisma,
) {
  try {
    const { body } = await readJsonRequest(request)
    const rateLimitResponse = await enforceLicenseV2RouteRateLimit(client, request, body)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    return createLicenseV2JsonResponse(
      await renewLicenseV2Session(client, body, getRequestMetadata(request)),
    )
  } catch (error) {
    return createUnexpectedErrorResponse('License v2 session 续租失败', error)
  }
}

export async function handleLicenseV2StatusRequest(
  request: Request,
  client: PrismaClient = prisma,
) {
  try {
    const parsedRequest = await readJsonRequest(request)
    const rateLimitResponse = await enforceLicenseV2RouteRateLimit(client, request, parsedRequest.body)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const verification = await verifyLicenseV2ProtectedRequest(client, {
      request,
      ...parsedRequest,
    })

    if (!verification.ok) {
      return createLicenseV2JsonResponse(verification.result)
    }

    return createLicenseV2JsonResponse(await getLicenseV2Status(client, verification.session))
  } catch (error) {
    return createUnexpectedErrorResponse('License v2 状态查询失败', error)
  }
}

export async function handleConsumeLicenseV2Request(
  request: Request,
  client: PrismaClient = prisma,
) {
  try {
    const parsedRequest = await readJsonRequest(request)
    const rateLimitResponse = await enforceLicenseV2RouteRateLimit(client, request, parsedRequest.body)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const verification = await verifyLicenseV2ProtectedRequest(client, {
      request,
      ...parsedRequest,
    })

    if (!verification.ok) {
      return createLicenseV2JsonResponse(verification.result)
    }

    return createLicenseV2JsonResponse(
      await consumeLicenseV2(client, verification.session, parsedRequest.body),
    )
  } catch (error) {
    return createUnexpectedErrorResponse('License v2 消费授权失败', error)
  }
}
