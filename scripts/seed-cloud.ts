import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

import {
  buildDefaultSystemConfigs,
  defaultConfigValues,
  stringifyConfigValue,
} from '../src/lib/system-config-defaults'
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_PROJECT_KEY,
  DEFAULT_PROJECT_NAME,
} from '../src/lib/dev-bootstrap'
import { generateProjectApiSecret } from '../src/lib/project-api-secret'

const prisma = new PrismaClient()

function requireCloudEnvironment() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('Cloud seed requires DATABASE_URL.')
  }

  if ((process.env.NODE_ENV || 'production') === 'production' && !process.env.JWT_SECRET?.trim()) {
    throw new Error('Cloud seed requires JWT_SECRET in production.')
  }
}

function resolveInitialAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim() || DEFAULT_ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD?.trim()

  if ((process.env.NODE_ENV || 'production') === 'production' && !password) {
    throw new Error('Cloud seed requires ADMIN_PASSWORD before the first deployment.')
  }

  return {
    username,
    password: password || DEFAULT_ADMIN_PASSWORD,
  }
}

async function ensureDefaultProject() {
  await prisma.project.upsert({
    where: {
      projectKey: DEFAULT_PROJECT_KEY,
    },
    update: {
      name: DEFAULT_PROJECT_NAME,
      isEnabled: true,
    },
    create: {
      name: DEFAULT_PROJECT_NAME,
      projectKey: DEFAULT_PROJECT_KEY,
      apiSecret: generateProjectApiSecret(),
      description: '系统兼容默认项目',
      isEnabled: true,
    },
  })

  const projectsWithoutSecret = await prisma.project.findMany({
    where: {
      OR: [{ apiSecret: null }, { apiSecret: '' }],
    },
    select: {
      id: true,
    },
  })

  await Promise.all(
    projectsWithoutSecret.map((project) =>
      prisma.project.update({
        where: {
          id: project.id,
        },
        data: {
          apiSecret: generateProjectApiSecret(),
        },
      }),
    ),
  )
}

async function ensureSystemConfigs() {
  const existingConfigs = await prisma.systemConfig.findMany({
    select: {
      key: true,
    },
  })
  const existingKeys = new Set(existingConfigs.map((config) => config.key))
  const configsToCreate = buildDefaultSystemConfigs({
    nodeEnv: process.env.NODE_ENV || 'production',
    jwtSecretEnv: process.env.JWT_SECRET,
    allowedIPsEnv: process.env.ALLOWED_IPS,
  }).filter((config) => !existingKeys.has(config.key))

  if (configsToCreate.length === 0) {
    return
  }

  await Promise.all(
    configsToCreate.map((config) =>
      prisma.systemConfig.upsert({
        where: {
          key: config.key,
        },
        update: {},
        create: {
          key: config.key,
          value: stringifyConfigValue(config.value),
          description: config.description,
        },
      }),
    ),
  )
}

async function ensureDefaultAdmin() {
  const adminCount = await prisma.admin.count()
  if (adminCount > 0) {
    return
  }

  const initialAdmin = resolveInitialAdmin()
  const passwordHash = await bcrypt.hash(
    initialAdmin.password,
    Number(defaultConfigValues.bcryptRounds),
  )

  await prisma.admin.create({
    data: {
      username: initialAdmin.username,
      password: passwordHash,
    },
  })
}

async function main() {
  requireCloudEnvironment()
  await ensureDefaultProject()
  await ensureSystemConfigs()
  await ensureDefaultAdmin()
  console.log('Cloud database seed completed.')
}

main()
  .catch((error) => {
    console.error('Cloud database seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
