import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'

import {
  enforceLicenseApiRateLimit,
  verifyProjectLicenseApiSignature,
} from '../src/lib/license-api-security'

function buildSignedRequest(input: {
  url: string
  body: Record<string, unknown>
  apiSecret: string
  nonce?: string
  timestamp?: string
}) {
  const rawBody = JSON.stringify(input.body)
  const timestamp = input.timestamp ?? String(Math.floor(Date.now() / 1000))
  const nonce = input.nonce ?? crypto.randomBytes(8).toString('hex')
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex')
  const canonicalInput = [
    'POST',
    new URL(input.url).pathname,
    timestamp,
    nonce,
    bodyHash,
  ].join('\n')
  const signature = crypto.createHmac('sha256', input.apiSecret).update(canonicalInput).digest('hex')

  return {
    request: new Request(input.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-license-timestamp': timestamp,
        'x-license-nonce': nonce,
        'x-license-signature': signature,
      },
      body: rawBody,
    }),
    parsedRequest: {
      rawBody,
      params: {
        projectKey: String(input.body.projectKey || ''),
        code: String(input.body.code || ''),
        machineId: String(input.body.machineId || ''),
        requestId: typeof input.body.requestId === 'string' ? input.body.requestId : undefined,
      },
    },
  }
}

function createSignatureClient(apiSecret = 'unit-test-secret') {
  const usedNonces = new Set<string>()

  return {
    project: {
      findUnique: async () => ({
        id: 1,
        isEnabled: true,
        apiSecret,
      }),
    },
    licenseApiNonce: {
      create: async ({ data }: { data: { nonce: string } }) => {
        if (usedNonces.has(data.nonce)) {
          const error = new Error('duplicate nonce') as Error & { code: string }
          error.code = 'P2002'
          throw error
        }

        usedNonces.add(data.nonce)
        return { id: usedNonces.size, ...data }
      },
      deleteMany: async () => ({ count: 0 }),
    },
    licenseApiRateLimitState: {
      findUnique: async () => null,
      upsert: async () => ({}),
      update: async () => ({}),
    },
  }
}

function createRateLimitClient() {
  const states = new Map<string, { key: string; count: number; windowStartedAt: Date }>()

  return {
    project: {
      findUnique: async () => null,
    },
    licenseApiNonce: {
      create: async () => ({}),
      deleteMany: async () => ({ count: 0 }),
    },
    licenseApiRateLimitState: {
      findUnique: async ({ where }: { where: { key: string } }) => states.get(where.key) ?? null,
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { key: string }
        update: { count: number; windowStartedAt: Date }
        create: { key: string; count: number; windowStartedAt: Date }
      }) => {
        const nextState = states.has(where.key)
          ? { key: where.key, ...update }
          : { key: create.key, count: create.count, windowStartedAt: create.windowStartedAt }
        states.set(where.key, nextState)
        return nextState
      },
      update: async ({
        where,
        data,
      }: {
        where: { key: string }
        data: { count: { increment: number } }
      }) => {
        const state = states.get(where.key)
        if (!state) {
          throw new Error('missing rate limit state')
        }

        state.count += data.count.increment
        return state
      },
    },
  }
}

test('verifyProjectLicenseApiSignature accepts a valid project HMAC signature', async () => {
  const apiSecret = 'project-secret'
  const { request, parsedRequest } = buildSignedRequest({
    url: 'http://127.0.0.1:3000/api/license/activate',
    body: {
      projectKey: 'signed-project',
      code: 'CODE-001',
      machineId: 'machine-001',
    },
    apiSecret,
  })

  const result = await verifyProjectLicenseApiSignature(
    createSignatureClient(apiSecret) as never,
    request,
    parsedRequest,
  )

  assert.equal(result.ok, true)
})

test('verifyProjectLicenseApiSignature rejects missing signature headers when a project has apiSecret', async () => {
  const rawBody = JSON.stringify({
    projectKey: 'signed-project',
    code: 'CODE-001',
    machineId: 'machine-001',
  })
  const result = await verifyProjectLicenseApiSignature(
    createSignatureClient('project-secret') as never,
    new Request('http://127.0.0.1:3000/api/license/activate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: rawBody,
    }),
    {
      rawBody,
      params: {
        projectKey: 'signed-project',
        code: 'CODE-001',
        machineId: 'machine-001',
      },
    },
  )

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.response.status, 401)
  }
})

test('enforceLicenseApiRateLimit blocks requests above the configured window quota', async (t) => {
  const originalMax = process.env.LICENSE_API_RATE_LIMIT_MAX
  const originalWindow = process.env.LICENSE_API_RATE_LIMIT_WINDOW_SECONDS

  process.env.LICENSE_API_RATE_LIMIT_MAX = '1'
  process.env.LICENSE_API_RATE_LIMIT_WINDOW_SECONDS = '60'

  t.after(() => {
    if (originalMax === undefined) {
      delete process.env.LICENSE_API_RATE_LIMIT_MAX
    } else {
      process.env.LICENSE_API_RATE_LIMIT_MAX = originalMax
    }

    if (originalWindow === undefined) {
      delete process.env.LICENSE_API_RATE_LIMIT_WINDOW_SECONDS
    } else {
      process.env.LICENSE_API_RATE_LIMIT_WINDOW_SECONDS = originalWindow
    }
  })

  const client = createRateLimitClient()
  const request = new Request('http://127.0.0.1:3000/api/license/status', {
    method: 'POST',
    headers: {
      'x-forwarded-for': '203.0.113.10',
    },
  })
  const params = {
    projectKey: 'rate-project',
    code: 'CODE-001',
    machineId: 'machine-001',
  }

  const firstResult = await enforceLicenseApiRateLimit(client as never, request, params)
  const secondResult = await enforceLicenseApiRateLimit(client as never, request, params)

  assert.equal(firstResult.ok, true)
  assert.equal(secondResult.ok, false)
  if (!secondResult.ok) {
    assert.equal(secondResult.response.status, 429)
    assert.match(secondResult.response.headers.get('retry-after') || '', /^[1-9]\d*$/)
  }
})
