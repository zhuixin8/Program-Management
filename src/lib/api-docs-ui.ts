type ApiDocsSummaryTone = 'sky' | 'emerald' | 'violet'

export type ApiDocsSummaryCard = {
  label: string
  value: string
  description: string
  tone: ApiDocsSummaryTone
}

export type ApiResearchStep = {
  step: string
  title: string
  description: string
  outcome: string
}

export type ApiLicenseModelCard = {
  title: string
  badge: string
  description: string
  bullets: string[]
}

export type ApiFieldDoc = {
  field: string
  type: string
  required: string
  description: string
}

export type ApiEndpointDoc = {
  key: 'activate' | 'status' | 'consume' | 'verify'
  title: string
  audience: 'recommended' | 'compat'
  method: 'POST'
  path: string
  summary: string
  whenToUse: string
  highlights: string[]
  requestExample: string
  responseExample: string
}

export type ApiLanguageSnippet = {
  key: 'sdk' | 'python' | 'curl'
  label: string
  description: string
  code: string
}

export type AdminEndpointDoc = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  description: string
}

export type AdminEndpointGroup = {
  title: string
  description: string
  endpoints: AdminEndpointDoc[]
}

export function buildApiDocsPageModel() {
  const summaryCards: ApiDocsSummaryCard[] = [
    {
      label: '正式接入流程',
      value: '3 个接口',
      description: '新客户端按 activate / status / consume 接入：先绑定设备，再查询状态，最后在真实业务发生时扣次。',
      tone: 'sky',
    },
    {
      label: '历史兼容入口',
      value: '/api/verify',
      description: '保留给旧插件和历史客户端；新接入请迁移到三段式正式接口，避免验证和扣次语义混在一起。',
      tone: 'violet',
    },
    {
      label: '联调闭环',
      value: '6 步',
      description: '从 projectKey、授权模型、设备绑定、幂等扣次到日志回查，形成可复现的接入验证流程。',
      tone: 'emerald',
    },
  ]

  const researchSteps: ApiResearchStep[] = [
    {
      step: '01',
      title: '确认 projectKey 与授权模型',
      description: '在后台项目管理中确认接入方使用的 projectKey，并区分测试激活码是 TIME 有效期模式还是 COUNT 次数模式。',
      outcome: '避免不同产品或客户混用激活码；也能提前判断客户端是否必须传 requestId。',
    },
    {
      step: '02',
      title: '调用 activate 完成设备绑定',
      description: '用户首次录入激活码时调用 /api/license/activate，并把本地持久化的 machineId 一起提交。',
      outcome: 'TIME 模式会从首次激活开始计算有效期；COUNT 模式只建立绑定关系，不会立即扣减次数。',
    },
    {
      step: '03',
      title: '调用 status 展示授权状态',
      description: '用同一组 code + machineId 调用 /api/license/status，读取 expiresAt、remainingCount、valid 等字段。',
      outcome: '适合在插件启动、设置页刷新、用户查看授权信息时调用，不会产生额外扣次。',
    },
    {
      step: '04',
      title: '业务成功时调用 consume',
      description: '只有真实业务动作完成时才调用 /api/license/consume，并为每次业务动作生成稳定 requestId。',
      outcome: '同一 requestId 重放会命中幂等结果，避免网络重试或按钮连点导致重复扣次。',
    },
    {
      step: '05',
      title: '在消费日志中按 requestId 回查',
      description: '联调时把 requestId、machineId 或激活码带到后台消费日志中检索，核对扣次结果和剩余次数。',
      outcome: '接口调用、设备信息和后台记录可以一一对应，便于定位重复请求、错误设备或项目混用。',
    },
    {
      step: '06',
      title: '用 smoke 脚本做回归验证',
      description: '本地启动后执行 smoke:license-api，自动完成登录、建项目、生成 COUNT 激活码、激活、查询状态和幂等扣次。',
      outcome: '把人工联调固化为可重复的回归脚本，后续修改接口时能快速发现行为变化。',
    },
  ]

  const licenseModels: ApiLicenseModelCard[] = [
    {
      title: '时间型激活码',
      badge: 'TIME',
      description: '适合按天/月/年计费的授权模式，首次激活后开始计算有效期。',
      bullets: [
        '首次 activate 时写入 usedBy / usedAt / expiresAt。',
        '后续 status / consume 只做有效性校验，不扣减次数。',
        '插件展示剩余有效期时，优先使用 expiresAt / expires_at。',
      ],
    },
    {
      title: '次数型激活码',
      badge: 'COUNT',
      description: '适合浏览器插件、桌面工具等按次数消耗的场景。',
      bullets: [
        'activate 只绑定设备，不扣减 remainingCount。',
        'consume 每次成功调用扣减 1 次，且支持 requestId 幂等。',
        'status 可用于展示剩余次数、是否已激活与当前是否仍有效。',
      ],
    },
    {
      title: '多项目隔离',
      badge: 'PROJECT',
      description: '同一个服务端可同时给多个产品、插件或客户提供独立授权空间。',
      bullets: [
        '每张激活码都归属于某个 projectKey。',
        '同一台设备可以在不同 projectKey 下分别绑定激活码。',
        '项目停用后，正式接口会直接返回“项目已停用”。',
      ],
    },
  ]

  const requestFields: ApiFieldDoc[] = [
    {
      field: 'projectKey / project_key',
      type: 'string',
      required: '否',
      description: '项目标识；用于隔离不同产品、插件或客户。不传时走 default 项目。',
    },
    {
      field: 'code',
      type: 'string',
      required: '是',
      description: '后台生成并发放给用户的激活码正文。',
    },
    {
      field: 'machineId / machine_id',
      type: 'string',
      required: '是',
      description: '设备唯一标识；建议客户端首次启动时生成并持久化一个稳定 UUID。',
    },
    {
      field: 'requestId / request_id',
      type: 'string',
      required: '仅 consume 推荐',
      description: 'consume 幂等键；同一 requestId 重试时不会重复扣减次数。',
    },
  ]

  const responseFields: ApiFieldDoc[] = [
    {
      field: 'success',
      type: 'boolean',
      required: '总是返回',
      description: '业务处理是否成功；HTTP 200 不代表授权一定通过，请同时判断该字段。',
    },
    {
      field: 'message',
      type: 'string',
      required: '总是返回',
      description: '面向客户端展示或日志记录的结果说明。',
    },
    {
      field: 'licenseMode / license_mode',
      type: 'TIME | COUNT | null',
      required: '按场景返回',
      description: '授权模型；TIME 表示有效期授权，COUNT 表示按次数消费。',
    },
    {
      field: 'expiresAt / expires_at',
      type: 'string | null',
      required: '时间型常用',
      description: 'TIME 模式的过期时间；COUNT 模式通常为空。',
    },
    {
      field: 'remainingCount / remaining_count',
      type: 'number | null',
      required: '次数型常用',
      description: 'COUNT 模式的剩余次数；TIME 模式通常为空。',
    },
    {
      field: 'isActivated / is_activated',
      type: 'boolean | null',
      required: '按场景返回',
      description: '当前激活码是否已经绑定到设备。',
    },
    {
      field: 'valid',
      type: 'boolean | null',
      required: '按场景返回',
      description: '当前授权是否仍可继续使用。',
    },
    {
      field: 'idempotent',
      type: 'boolean | null',
      required: 'consume 常用',
      description: 'consume 是否命中 requestId 幂等重放；true 表示没有再次扣次。',
    },
  ]

  const endpoints: ApiEndpointDoc[] = [
    {
      key: 'activate',
      title: '激活并绑定设备',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/activate',
      summary: '把激活码绑定到当前 machineId，建立设备与授权码之间的正式关系。',
      whenToUse: '用户首次录入激活码，或需要重新确认当前设备是否已经绑定该激活码时调用。',
      highlights: [
        'TIME 模式会在首次激活时写入有效期起点。',
        'COUNT 模式只完成设备绑定，不扣减 remainingCount。',
        '同一项目下设备绑定会受 projectKey 和 machineId 约束。',
      ],
      requestExample: `{
  "projectKey": "browser-plugin",
  "code": "A1B2C3D4E5F6G7H8",
  "machineId": "machine-001"
}`,
      responseExample: `{
  "success": true,
  "message": "激活码激活成功",
  "licenseMode": "COUNT",
  "license_mode": "COUNT",
  "expiresAt": null,
  "expires_at": null,
  "remainingCount": 2,
  "remaining_count": 2,
  "isActivated": true,
  "is_activated": true,
  "valid": true,
  "idempotent": null
}`,
    },
    {
      key: 'status',
      title: '查询授权状态',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/status',
      summary: '查询激活码是否已绑定、是否仍有效，以及剩余次数或过期时间。',
      whenToUse: '插件启动、设置页展示授权信息、用户点击刷新授权状态或后台排查客户问题时调用。',
      highlights: [
        '只查询状态，不会扣减 COUNT 模式的剩余次数。',
        '建议先调用 activate 建立绑定，再用 status 展示授权摘要。',
        '返回 camelCase 与 snake_case 字段，便于新旧客户端共用。',
      ],
      requestExample: `{
  "project_key": "browser-plugin",
  "code": "A1B2C3D4E5F6G7H8",
  "machine_id": "machine-001"
}`,
      responseExample: `{
  "success": true,
  "message": "获取激活码状态成功",
  "licenseMode": "COUNT",
  "license_mode": "COUNT",
  "expiresAt": null,
  "expires_at": null,
  "remainingCount": 2,
  "remaining_count": 2,
  "isActivated": true,
  "is_activated": true,
  "valid": true,
  "idempotent": null
}`,
    },
    {
      key: 'consume',
      title: '消费一次授权额度',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/consume',
      summary: '在真实业务动作完成后消费一次授权额度；TIME 模式下用于校验授权仍然有效。',
      whenToUse: '插件完成一次计算、分析、导出、生成结果或调用高价值功能后调用。',
      highlights: [
        'COUNT 模式每次成功 consume 扣减 1 次。',
        '同一 requestId 重试会返回 idempotent: true，不重复扣次。',
        'TIME 模式只校验有效期，不产生次数扣减。',
      ],
      requestExample: `{
  "projectKey": "browser-plugin",
  "code": "A1B2C3D4E5F6G7H8",
  "machineId": "machine-001",
  "requestId": "req-001"
}`,
      responseExample: `{
  "success": true,
  "message": "激活码验证成功",
  "licenseMode": "COUNT",
  "license_mode": "COUNT",
  "remainingCount": 1,
  "remaining_count": 1,
  "isActivated": true,
  "is_activated": true,
  "valid": true,
  "idempotent": false
}`,
    },
    {
      key: 'verify',
      title: '历史 verify 兼容入口',
      audience: 'compat',
      method: 'POST',
      path: '/api/verify',
      summary: '保留给旧插件和历史客户端的兼容入口，语义上同时承担验证和消费。',
      whenToUse: '只用于无法立即升级的旧客户端；新版本请改造为 activate + status + consume。',
      highlights: [
        'TIME 模式下首次调用会激活，后续只做有效性校验。',
        'COUNT 模式下每次成功调用都会扣减一次。',
        '不建议在新客户端继续使用 verify 作为正式入口。',
      ],
      requestExample: `{
  "project_key": "browser-plugin",
  "code": "A1B2C3D4E5F6G7H8",
  "machine_id": "machine-001"
}`,
      responseExample: `{
  "success": true,
  "message": "激活码验证成功",
  "license_mode": "COUNT",
  "expires_at": null,
  "remaining_count": 1
}`,
    },
  ]

  const signatureExample = String.raw`import crypto from 'node:crypto'

const apiSecret = 'paste-project-api-secret-here'
const method = 'POST'
const path = '/api/license/status'
const body = JSON.stringify({
  projectKey: 'browser-plugin',
  code: 'A1B2C3D4E5F6G7H8',
  machineId: 'machine-001',
})

const timestamp = Math.floor(Date.now() / 1000).toString()
const nonce = crypto.randomUUID()
const bodyHash = crypto.createHash('sha256').update(body).digest('hex')
const canonicalInput = [method, path, timestamp, nonce, bodyHash].join('\n')
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(canonicalInput)
  .digest('hex')

await fetch('http://127.0.0.1:3000' + path, {
  method,
  headers: {
    'Content-Type': 'application/json',
    'X-License-Timestamp': timestamp,
    'X-License-Nonce': nonce,
    'X-License-Signature': signature,
    'X-License-Signature-Version': 'v1',
  },
  body,
})`

  const languageSnippets: ApiLanguageSnippet[] = [
    {
      key: 'sdk',
      label: 'JavaScript / TypeScript SDK',
      description: '适合浏览器插件、Electron/Tauri 桌面端和 Node 服务复用，内置超时、重试和错误类型。',
      code: String.raw`import { createLicenseClient, isLicenseClientError } from '@/lib/license-sdk'

const client = createLicenseClient({
  baseUrl: 'http://127.0.0.1:3000',
  projectKey: 'browser-plugin',
  apiSecret: 'paste-project-api-secret-here',
  timeoutMs: 10000,
  maxRetries: 1,
  retryDelayMs: 200,
})

const activateResult = await client.activate({
  code: 'A1B2C3D4E5F6G7H8',
  machineId: 'machine-001',
})

const statusResult = await client.status({
  code: 'A1B2C3D4E5F6G7H8',
  machineId: 'machine-001',
})

const consumeResult = await client.consume({
  code: 'A1B2C3D4E5F6G7H8',
  machineId: 'machine-001',
  requestId: 'req-001',
})

try {
  await client.consume({
    code: 'A1B2C3D4E5F6G7H8',
    machineId: 'machine-001',
    requestId: 'req-001',
  })
} catch (error) {
  if (isLicenseClientError(error)) {
    console.error(error.code, error.path, error.attemptCount)
  }
}`,
    },
    {
      key: 'python',
      label: 'Python requests',
      description: '适合桌面脚本、内网工具和测试平台联调正式授权接口。',
      code: String.raw`import requests

BASE_URL = "http://127.0.0.1:3000"
COMMON_BODY = {
    "projectKey": "browser-plugin",
    "code": "A1B2C3D4E5F6G7H8",
    "machineId": "machine-001",
}

activate_resp = requests.post(f"{BASE_URL}/api/license/activate", json=COMMON_BODY, timeout=10)
print("activate", activate_resp.status_code, activate_resp.json())

status_resp = requests.post(f"{BASE_URL}/api/license/status", json=COMMON_BODY, timeout=10)
print("status", status_resp.status_code, status_resp.json())

consume_resp = requests.post(
    f"{BASE_URL}/api/license/consume",
    json={**COMMON_BODY, "requestId": "req-001"},
    timeout=10,
)
print("consume", consume_resp.status_code, consume_resp.json())

legacy_resp = requests.post(
    f"{BASE_URL}/api/verify",
    json={
        "project_key": "browser-plugin",
        "code": "A1B2C3D4E5F6G7H8",
        "machine_id": "machine-001",
    },
    timeout=10,
)
print("verify", legacy_resp.status_code, legacy_resp.json())`,
    },
    {
      key: 'curl',
      label: 'cURL / Postman 参考',
      description: '适合快速复现问题、整理 Postman collection，或把请求样例交给后端和测试同学。',
      code: String.raw`# activate
curl -X POST "http://127.0.0.1:3000/api/license/activate" \
  -H "Content-Type: application/json" \
  -d '{
    "projectKey": "browser-plugin",
    "code": "A1B2C3D4E5F6G7H8",
    "machineId": "machine-001"
  }'

# status
curl -X POST "http://127.0.0.1:3000/api/license/status" \
  -H "Content-Type: application/json" \
  -d '{
    "project_key": "browser-plugin",
    "code": "A1B2C3D4E5F6G7H8",
    "machine_id": "machine-001"
  }'

# consume
curl -X POST "http://127.0.0.1:3000/api/license/consume" \
  -H "Content-Type: application/json" \
  -d '{
    "projectKey": "browser-plugin",
    "code": "A1B2C3D4E5F6G7H8",
    "machineId": "machine-001",
    "requestId": "req-001"
  }'

# legacy verify
curl -X POST "http://127.0.0.1:3000/api/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "project_key": "browser-plugin",
    "code": "A1B2C3D4E5F6G7H8",
    "machine_id": "machine-001"
  }'`,
    },
  ]

  const adminGroups: AdminEndpointGroup[] = [
    {
      title: '项目与发码',
      description: '用于准备接入环境：先创建 projectKey，再为对应项目生成 TIME 或 COUNT 激活码。',
      endpoints: [
        {
          method: 'POST',
          path: '/api/admin/projects',
          description: '创建项目，为不同产品、插件或客户生成独立 projectKey。',
        },
        {
          method: 'PATCH',
          path: '/api/admin/projects/{id}',
          description: '维护项目名称、描述、启停状态和项目级策略。',
        },
        {
          method: 'POST',
          path: '/api/admin/codes/generate',
          description: '为指定项目批量生成 TIME 或 COUNT 激活码。',
        },
        {
          method: 'GET',
          path: '/api/admin/codes/list',
          description: '查看已发放激活码，反查绑定设备、剩余次数和有效期。',
        },
      ],
    },
    {
      title: '日志与统计',
      description: '用于排查客户反馈、核对扣次结果和导出运营数据。',
      endpoints: [
        {
          method: 'GET',
          path: '/api/admin/consumptions',
          description: '按 projectKey、关键词和时间范围查询消费日志。',
        },
        {
          method: 'GET',
          path: '/api/admin/consumptions/export',
          description: '按当前筛选条件导出消费日志 CSV，便于对账和留档。',
        },
        {
          method: 'GET',
          path: '/api/admin/consumptions/trend',
          description: '查看 1-90 天消费趋势，支持按日、周、月聚合。',
        },
        {
          method: 'GET',
          path: '/api/admin/codes/stats',
          description: '查看全局和项目级授权统计。',
        },
      ],
    },
  ]

  const localDebugging = [
    {
      title: '自动化烟雾测试',
      command: 'BASE_URL=http://127.0.0.1:3000 npm run smoke:license-api',
      description: '自动完成登录、建项目、生成次数卡、激活、状态查询、幂等扣次等整条链路验证。',
    },
    {
      title: '查看详细对接文档',
      command: '打开项目根目录下的 apidocs.md',
      description: '适合把完整 API 文档同步给前端、测试或第三方接入方。',
    },
    {
      title: '复用 SDK 源码',
      command: 'src/lib/license-sdk.ts',
      description: '如果你的插件也是 JS / TS 生态，直接复用 SDK 比手写 fetch 更稳。',
    },
  ]

  return {
    summaryCards,
    researchSteps,
    licenseModels,
    requestFields,
    responseFields,
    endpoints,
    signatureExample,
    languageSnippets,
    adminGroups,
    localDebugging,
  }
}
