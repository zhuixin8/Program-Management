import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'

import { prisma } from './db'
import {
  blockLicenseV2ClientVersion,
  listLicenseV2DevicesPage,
  listLicenseV2SecurityEventsPage,
  listLicenseV2SessionsPage,
  revokeLicenseV2Device,
  revokeLicenseV2Session,
} from './admin-license-v2-service'

function readPagination(requestUrl: URL) {
  const rawPage = requestUrl.searchParams.get('page')
  const rawPageSize = requestUrl.searchParams.get('pageSize')

  return {
    page: rawPage ? Number(rawPage) : undefined,
    pageSize: rawPageSize ? Number(rawPageSize) : undefined,
  }
}

export function readLicenseV2DeviceFilters(request: Request) {
  const requestUrl = new URL(request.url)

  return {
    projectKey: requestUrl.searchParams.get('projectKey') || undefined,
    status: requestUrl.searchParams.get('status') || undefined,
    keyword: requestUrl.searchParams.get('keyword') || undefined,
    appVersion: requestUrl.searchParams.get('appVersion') || undefined,
    ...readPagination(requestUrl),
  }
}

export function readLicenseV2SessionFilters(request: Request) {
  const requestUrl = new URL(request.url)

  return {
    projectKey: requestUrl.searchParams.get('projectKey') || undefined,
    status: requestUrl.searchParams.get('status') || undefined,
    keyword: requestUrl.searchParams.get('keyword') || undefined,
    ...readPagination(requestUrl),
  }
}

export function readLicenseV2SecurityEventFilters(request: Request) {
  const requestUrl = new URL(request.url)

  return {
    projectKey: requestUrl.searchParams.get('projectKey') || undefined,
    eventType: requestUrl.searchParams.get('eventType') || undefined,
    severity: requestUrl.searchParams.get('severity') || undefined,
    keyword: requestUrl.searchParams.get('keyword') || undefined,
    createdFrom: requestUrl.searchParams.get('createdFrom') || undefined,
    createdTo: requestUrl.searchParams.get('createdTo') || undefined,
    ...readPagination(requestUrl),
  }
}

function parsePositiveId(value: string) {
  const id = Number(value)

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('ID 无效')
  }

  return id
}

export async function handleListLicenseV2DevicesRequest(
  request: Request,
  client: PrismaClient = prisma,
) {
  const { devices, pagination } = await listLicenseV2DevicesPage(
    client,
    readLicenseV2DeviceFilters(request),
  )

  return NextResponse.json({
    success: true,
    devices,
    pagination,
  })
}

export async function handleListLicenseV2SessionsRequest(
  request: Request,
  client: PrismaClient = prisma,
) {
  const { sessions, pagination } = await listLicenseV2SessionsPage(
    client,
    readLicenseV2SessionFilters(request),
  )

  return NextResponse.json({
    success: true,
    sessions,
    pagination,
  })
}

export async function handleListLicenseV2SecurityEventsRequest(
  request: Request,
  client: PrismaClient = prisma,
) {
  const { events, pagination } = await listLicenseV2SecurityEventsPage(
    client,
    readLicenseV2SecurityEventFilters(request),
  )

  return NextResponse.json({
    success: true,
    events,
    pagination,
  })
}

export async function handleRevokeLicenseV2DeviceRequest(
  request: Request,
  input: {
    id: string
    adminUsername?: string
  },
  client: PrismaClient = prisma,
) {
  const payload = await request.json().catch(() => ({}))
  const device = await revokeLicenseV2Device(client, {
    id: parsePositiveId(input.id),
    adminUsername: input.adminUsername,
    reason: typeof payload.reason === 'string' ? payload.reason : null,
  })

  return NextResponse.json({
    success: true,
    message: 'License v2 设备已吊销',
    device,
  })
}

export async function handleRevokeLicenseV2SessionRequest(
  request: Request,
  input: {
    id: string
    adminUsername?: string
  },
  client: PrismaClient = prisma,
) {
  const payload = await request.json().catch(() => ({}))
  const session = await revokeLicenseV2Session(client, {
    id: parsePositiveId(input.id),
    adminUsername: input.adminUsername,
    reason: typeof payload.reason === 'string' ? payload.reason : null,
  })

  return NextResponse.json({
    success: true,
    message: 'License v2 session 已吊销',
    session,
  })
}

export async function handleBlockLicenseV2ClientVersionRequest(
  request: Request,
  input: {
    adminUsername?: string
  } = {},
  client: PrismaClient = prisma,
) {
  const payload = await request.json()
  const blockedVersion = await blockLicenseV2ClientVersion(client, {
    projectKey: typeof payload.projectKey === 'string' ? payload.projectKey : undefined,
    appVersion: typeof payload.appVersion === 'string' ? payload.appVersion : undefined,
    reason: typeof payload.reason === 'string' ? payload.reason : null,
    adminUsername: input.adminUsername,
  })

  return NextResponse.json({
    success: true,
    message: 'License v2 客户端版本已封禁',
    blockedVersion,
  })
}
