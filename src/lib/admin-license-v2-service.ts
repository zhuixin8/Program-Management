import { Prisma, PrismaClient } from '@prisma/client'

import { findProjectByProjectKey, resolveProject, type DbClient } from './license-project-service'
import { recordLicenseV2SecurityEvent } from './license-v2-service'

type LicenseV2ManagementClient = PrismaClient | Prisma.TransactionClient

type LicenseV2PageInput = {
  page?: number
  pageSize?: number
}

export type LicenseV2DeviceFilters = LicenseV2PageInput & {
  projectKey?: string
  status?: string
  keyword?: string
  appVersion?: string
}

export type LicenseV2SessionFilters = LicenseV2PageInput & {
  projectKey?: string
  status?: string
  keyword?: string
}

export type LicenseV2SecurityEventFilters = LicenseV2PageInput & {
  projectKey?: string
  eventType?: string
  severity?: string
  keyword?: string
  createdFrom?: string | Date
  createdTo?: string | Date
}

type LicenseV2Pagination = {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const ACTIVE_STATUS = 'ACTIVE'
const REVOKED_STATUS = 'REVOKED'
const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

function normalizeOptionalText(value?: string | null) {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : null
}

function normalizePositiveInteger(value: number | undefined, fieldName: string) {
  if (value === undefined) {
    return null
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${fieldName} 必须是大于 0 的整数`)
  }

  return value
}

function normalizePage(value?: number) {
  return normalizePositiveInteger(value, 'page') ?? DEFAULT_PAGE
}

function normalizePageSize(value?: number) {
  const pageSize = normalizePositiveInteger(value, 'pageSize') ?? DEFAULT_PAGE_SIZE

  if (pageSize > MAX_PAGE_SIZE) {
    throw new Error(`pageSize 必须是 1-${MAX_PAGE_SIZE} 之间的整数`)
  }

  return pageSize
}

function normalizeOptionalDateInput(value?: string | Date) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const normalizedValue = String(value).trim()
  if (!normalizedValue) {
    return null
  }

  const parsedDate = new Date(normalizedValue)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function buildPagination(total: number, page: number, pageSize: number): LicenseV2Pagination {
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize)
  const currentPage = total === 0 ? 1 : Math.min(page, totalPages)

  return {
    total,
    page: currentPage,
    pageSize,
    totalPages,
  }
}

async function resolveProjectIdFilter(client: LicenseV2ManagementClient, projectKey?: string) {
  const normalizedProjectKey = normalizeOptionalText(projectKey)

  if (!normalizedProjectKey || normalizedProjectKey === 'all') {
    return null
  }

  try {
    return await findProjectByProjectKey(client as DbClient, normalizedProjectKey)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === `项目不存在: ${normalizedProjectKey}`
    ) {
      return {
        id: -1,
      }
    }

    throw error
  }
}

async function buildLicenseV2DeviceWhere(
  client: LicenseV2ManagementClient,
  input?: LicenseV2DeviceFilters,
) {
  const conditions: Prisma.LicenseDeviceWhereInput[] = []
  const project = await resolveProjectIdFilter(client, input?.projectKey)
  const status = normalizeOptionalText(input?.status)
  const keyword = normalizeOptionalText(input?.keyword)
  const appVersion = normalizeOptionalText(input?.appVersion)

  if (project) {
    conditions.push({
      projectId: project.id,
    })
  }

  if (status && status !== 'all') {
    conditions.push({
      status,
    })
  }

  if (appVersion && appVersion !== 'all') {
    conditions.push({
      appVersion,
    })
  }

  if (keyword) {
    conditions.push({
      OR: [
        {
          machineId: {
            contains: keyword,
          },
        },
        {
          publicKeyFingerprint: {
            contains: keyword,
          },
        },
        {
          activationCode: {
            code: {
              contains: keyword,
            },
          },
        },
        {
          project: {
            projectKey: {
              contains: keyword,
            },
          },
        },
      ],
    })
  }

  return conditions.length === 0
    ? undefined
    : conditions.length === 1
      ? conditions[0]
      : { AND: conditions }
}

async function buildLicenseV2SessionWhere(
  client: LicenseV2ManagementClient,
  input?: LicenseV2SessionFilters,
) {
  const conditions: Prisma.LicenseSessionWhereInput[] = []
  const project = await resolveProjectIdFilter(client, input?.projectKey)
  const status = normalizeOptionalText(input?.status)
  const keyword = normalizeOptionalText(input?.keyword)

  if (project) {
    conditions.push({
      device: {
        projectId: project.id,
      },
    })
  }

  if (status && status !== 'all') {
    conditions.push({
      status,
    })
  }

  if (keyword) {
    conditions.push({
      OR: [
        {
          sessionId: {
            contains: keyword,
          },
        },
        {
          device: {
            machineId: {
              contains: keyword,
            },
          },
        },
        {
          device: {
            activationCode: {
              code: {
                contains: keyword,
              },
            },
          },
        },
      ],
    })
  }

  return conditions.length === 0
    ? undefined
    : conditions.length === 1
      ? conditions[0]
      : { AND: conditions }
}

async function buildLicenseV2SecurityEventWhere(
  client: LicenseV2ManagementClient,
  input?: LicenseV2SecurityEventFilters,
) {
  const conditions: Prisma.LicenseSecurityEventWhereInput[] = []
  const project = await resolveProjectIdFilter(client, input?.projectKey)
  const eventType = normalizeOptionalText(input?.eventType)
  const severity = normalizeOptionalText(input?.severity)
  const keyword = normalizeOptionalText(input?.keyword)
  const createdFrom = normalizeOptionalDateInput(input?.createdFrom)
  const createdTo = normalizeOptionalDateInput(input?.createdTo)

  if (input?.createdFrom && !createdFrom) {
    throw new Error('createdFrom 时间格式不正确')
  }

  if (input?.createdTo && !createdTo) {
    throw new Error('createdTo 时间格式不正确')
  }

  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw new Error('createdFrom 不能晚于 createdTo')
  }

  if (project) {
    conditions.push({
      projectId: project.id,
    })
  }

  if (eventType && eventType !== 'all') {
    conditions.push({
      eventType,
    })
  }

  if (severity && severity !== 'all') {
    conditions.push({
      severity,
    })
  }

  if (createdFrom || createdTo) {
    conditions.push({
      createdAt: {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lte: createdTo } : {}),
      },
    })
  }

  if (keyword) {
    conditions.push({
      OR: [
        {
          eventType: {
            contains: keyword,
          },
        },
        {
          detailJson: {
            contains: keyword,
          },
        },
        {
          device: {
            machineId: {
              contains: keyword,
            },
          },
        },
        {
          activationCode: {
            code: {
              contains: keyword,
            },
          },
        },
      ],
    })
  }

  return conditions.length === 0
    ? undefined
    : conditions.length === 1
      ? conditions[0]
      : { AND: conditions }
}

const licenseV2DeviceInclude = {
  project: {
    select: {
      id: true,
      name: true,
      projectKey: true,
    },
  },
  activationCode: {
    select: {
      id: true,
      code: true,
      licenseMode: true,
      remainingCount: true,
      totalCount: true,
    },
  },
  sessions: {
    orderBy: {
      createdAt: 'desc',
    },
    take: 3,
  },
} as const

const licenseV2SessionInclude = {
  device: {
    include: {
      project: {
        select: {
          id: true,
          name: true,
          projectKey: true,
        },
      },
      activationCode: {
        select: {
          id: true,
          code: true,
          licenseMode: true,
          remainingCount: true,
          totalCount: true,
        },
      },
    },
  },
} as const

const licenseV2SecurityEventInclude = {
  project: {
    select: {
      id: true,
      name: true,
      projectKey: true,
    },
  },
  activationCode: {
    select: {
      id: true,
      code: true,
    },
  },
  device: {
    select: {
      id: true,
      machineId: true,
      appVersion: true,
      status: true,
    },
  },
  licenseSession: {
    select: {
      id: true,
      sessionId: true,
      status: true,
    },
  },
} as const

export async function listLicenseV2DevicesPage(
  client: LicenseV2ManagementClient,
  input?: LicenseV2DeviceFilters,
) {
  const page = normalizePage(input?.page)
  const pageSize = normalizePageSize(input?.pageSize)
  const where = await buildLicenseV2DeviceWhere(client, input)
  const total = await client.licenseDevice.count({ where })
  const pagination = buildPagination(total, page, pageSize)
  const devices = await client.licenseDevice.findMany({
    where,
    include: licenseV2DeviceInclude,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    skip: (pagination.page - 1) * pageSize,
    take: pageSize,
  })

  return {
    devices,
    pagination,
  }
}

export async function listLicenseV2SessionsPage(
  client: LicenseV2ManagementClient,
  input?: LicenseV2SessionFilters,
) {
  const page = normalizePage(input?.page)
  const pageSize = normalizePageSize(input?.pageSize)
  const where = await buildLicenseV2SessionWhere(client, input)
  const total = await client.licenseSession.count({ where })
  const pagination = buildPagination(total, page, pageSize)
  const sessions = await client.licenseSession.findMany({
    where,
    include: licenseV2SessionInclude,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    skip: (pagination.page - 1) * pageSize,
    take: pageSize,
  })

  return {
    sessions,
    pagination,
  }
}

export async function listLicenseV2SecurityEventsPage(
  client: LicenseV2ManagementClient,
  input?: LicenseV2SecurityEventFilters,
) {
  const page = normalizePage(input?.page)
  const pageSize = normalizePageSize(input?.pageSize)
  const where = await buildLicenseV2SecurityEventWhere(client, input)
  const total = await client.licenseSecurityEvent.count({ where })
  const pagination = buildPagination(total, page, pageSize)
  const events = await client.licenseSecurityEvent.findMany({
    where,
    include: licenseV2SecurityEventInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (pagination.page - 1) * pageSize,
    take: pageSize,
  })

  return {
    events,
    pagination,
  }
}

export async function revokeLicenseV2Device(
  client: PrismaClient,
  input: {
    id: number
    adminUsername?: string
    reason?: string | null
  },
) {
  const now = new Date()

  return client.$transaction(async (tx) => {
    const device = await tx.licenseDevice.findUnique({
      where: {
        id: input.id,
      },
      include: {
        project: true,
        activationCode: true,
      },
    })

    if (!device) {
      throw new Error('License v2 设备不存在')
    }

    const updatedDevice = await tx.licenseDevice.update({
      where: {
        id: device.id,
      },
      data: {
        status: REVOKED_STATUS,
        revokedAt: device.revokedAt ?? now,
      },
      include: licenseV2DeviceInclude,
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

    await recordLicenseV2SecurityEvent(tx, {
      projectId: device.projectId,
      activationCodeId: device.activationCodeId,
      deviceId: device.id,
      eventType: 'ADMIN_DEVICE_REVOKED',
      severity: 'WARN',
      detail: {
        adminUsername: input.adminUsername ?? null,
        reason: normalizeOptionalText(input.reason) ?? null,
        machineId: device.machineId,
      },
    })

    return updatedDevice
  })
}

export async function revokeLicenseV2Session(
  client: PrismaClient,
  input: {
    id: number
    adminUsername?: string
    reason?: string | null
  },
) {
  const now = new Date()

  return client.$transaction(async (tx) => {
    const session = await tx.licenseSession.findUnique({
      where: {
        id: input.id,
      },
      include: licenseV2SessionInclude,
    })

    if (!session) {
      throw new Error('License v2 session 不存在')
    }

    const updatedSession = await tx.licenseSession.update({
      where: {
        id: session.id,
      },
      data: {
        status: REVOKED_STATUS,
        revokedAt: session.revokedAt ?? now,
      },
      include: licenseV2SessionInclude,
    })

    await recordLicenseV2SecurityEvent(tx, {
      projectId: session.device.projectId,
      activationCodeId: session.device.activationCodeId,
      deviceId: session.device.id,
      licenseSessionId: session.id,
      eventType: 'ADMIN_SESSION_REVOKED',
      severity: 'WARN',
      detail: {
        adminUsername: input.adminUsername ?? null,
        reason: normalizeOptionalText(input.reason) ?? null,
        sessionId: session.sessionId,
      },
    })

    return updatedSession
  })
}

export async function blockLicenseV2ClientVersion(
  client: DbClient,
  input: {
    projectKey?: string
    appVersion?: string
    reason?: string | null
    adminUsername?: string
  },
) {
  const appVersion = normalizeOptionalText(input.appVersion)

  if (!appVersion) {
    throw new Error('appVersion 不能为空')
  }

  const project = await resolveProject(client, input.projectKey)
  const blockedVersion = await client.blockedClientVersion.upsert({
    where: {
      projectId_appVersion: {
        projectId: project.id,
        appVersion,
      },
    },
    update: {
      reason: normalizeOptionalText(input.reason),
    },
    create: {
      projectId: project.id,
      appVersion,
      reason: normalizeOptionalText(input.reason),
    },
  })

  await recordLicenseV2SecurityEvent(client, {
    projectId: project.id,
    eventType: 'ADMIN_CLIENT_VERSION_BLOCKED',
    severity: 'WARN',
    detail: {
      adminUsername: input.adminUsername ?? null,
      appVersion,
      reason: normalizeOptionalText(input.reason) ?? null,
    },
  })

  return blockedVersion
}
