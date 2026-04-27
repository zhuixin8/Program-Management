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
      label: '先准备这些',
      value: '3 个值',
      description: '后台拿到 Base URL、projectKey 和 API Secret；客户端再保存一个稳定 machineId。',
      tone: 'sky',
    },
    {
      label: '正式接入流程',
      value: '3 个接口',
      description: '用户输入激活码时 activate，程序启动时 status，真正消耗权益时 consume。',
      tone: 'emerald',
    },
    {
      label: '旧接口',
      value: '/api/verify',
      description: '只给历史客户端兼容。新接入不要再用它，避免“查询状态”和“扣次数”混在一起。',
      tone: 'violet',
    },
  ]

  const researchSteps: ApiResearchStep[] = [
    {
      step: '01',
      title: '后台创建项目和激活码',
      description: '在后台项目管理里创建项目，复制 projectKey 和 API Secret，然后生成 TIME 或 COUNT 激活码。',
      outcome: '客户端只需要这三个值：Base URL、projectKey、API Secret；激活码发给用户输入。',
    },
    {
      step: '02',
      title: '客户端保存稳定 machineId',
      description: 'Python 程序首次运行时生成一个 UUID，保存到本机配置文件或系统钥匙串，以后每次请求都复用。',
      outcome: '服务端会把激活码绑定到这个设备；换电脑或重装后，会走自助换绑策略。',
    },
    {
      step: '03',
      title: '用户输入激活码后调用 activate',
      description: '把 code、machineId、projectKey 发到 /api/license/activate。TIME 从这里开始算有效期，COUNT 这里只绑定设备。',
      outcome: '激活成功后保存 code 和 machineId；不要在 activate 时扣减次数。',
    },
    {
      step: '04',
      title: '程序启动时调用 status',
      description: '用已保存的 code + machineId 调用 /api/license/status，判断 success 和 valid，再决定是否开放付费功能。',
      outcome: 'status 只查询授权，不扣次数，适合启动检查和授权信息展示。',
    },
    {
      step: '05',
      title: '功能真正完成后调用 consume',
      description: 'COUNT 次数卡在每次真实使用成功后调用 /api/license/consume，并为这次业务动作生成 requestId。',
      outcome: '同一个 requestId 重试不会重复扣次；TIME 授权调用 consume 只做有效性校验。',
    },
    {
      step: '06',
      title: '在后台日志里排查问题',
      description: '遇到客户反馈时，用激活码、machineId 或 requestId 在后台消费日志和绑定历史里搜索。',
      outcome: '可以确认是否已绑定其他设备、是否命中自助换绑、是否重复请求或次数用完。',
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
    {
      title: '设备绑定和自助换绑',
      badge: 'DEVICE',
      description: '激活码会绑定到 machineId；项目或单码可以配置是否允许用户自己换设备。',
      bullets: [
        '默认不允许自助换绑，后台可以按项目或单个激活码开启。',
        '可配置换绑冷却时间和最大自助换绑次数。',
        '用户换电脑时继续用同一激活码激活，会按策略自动判断是否允许换绑。',
      ],
    },
  ]

  const requestFields: ApiFieldDoc[] = [
    {
      field: 'projectKey / project_key',
      type: 'string',
      required: '否',
      description: '项目标识。建议每个桌面软件或产品使用独立 projectKey；不传时走 default 项目。',
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
      description: '设备唯一标识。必须稳定保存，不能每次启动重新生成。',
    },
    {
      field: 'requestId / request_id',
      type: 'string',
      required: '仅 consume 推荐',
      description: '每次真实业务动作的唯一 ID。网络重试时复用同一个值，不会重复扣次。',
    },
  ]

  const responseFields: ApiFieldDoc[] = [
    {
      field: 'success',
      type: 'boolean',
      required: '总是返回',
      description: '业务是否通过。客户端一定要判断这个字段，不要只看 HTTP 状态码。',
    },
    {
      field: 'message',
      type: 'string',
      required: '总是返回',
      description: '失败原因或成功提示，可直接用于日志，也可整理后展示给用户。',
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
      description: '当前授权是否仍可继续使用。启动检查时重点看 success 和 valid。',
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
      title: '1. 激活码绑定设备',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/activate',
      summary: '用户第一次输入激活码时调用。服务端会把激活码绑定到当前 machineId。',
      whenToUse: '登录授权页、设置页输入激活码、用户换设备后重新激活时调用。',
      highlights: [
        'TIME 授权从首次激活开始计算有效期。',
        'COUNT 授权这里只绑定设备，不扣次数。',
        '如果激活码已绑定其他设备，会按自助换绑策略判断。',
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
      title: '2. 查询授权是否有效',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/status',
      summary: '检查当前 code + machineId 是否还能使用，并返回剩余次数或过期时间。',
      whenToUse: '程序启动、用户打开授权信息页、用户点击刷新授权状态时调用。',
      highlights: [
        '只查询状态，不会扣减 COUNT 次数。',
        '客户端重点判断 success 和 valid。',
        '展示剩余次数用 remainingCount，展示有效期用 expiresAt。',
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
      title: '3. 次数卡扣一次',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/consume',
      summary: 'COUNT 授权每次真实使用成功后调用一次；TIME 授权调用它只做有效性校验。',
      whenToUse: '导出、生成、分析、识别、下载等付费功能真正完成后调用。',
      highlights: [
        'COUNT 每次成功 consume 扣 1 次。',
        '必须传 requestId，网络重试时复用同一个 requestId。',
        '重复 requestId 返回 idempotent: true，不会再次扣次。',
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
      title: '旧接口：verify',
      audience: 'compat',
      method: 'POST',
      path: '/api/verify',
      summary: '旧客户端兼容入口，会把验证和消费混在一个接口里。',
      whenToUse: '只用于历史版本。新 Python 桌面程序不要使用这个接口。',
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

  const signatureExample = String.raw`import hashlib
import hmac
import json
import time
import uuid

api_secret = "paste-project-api-secret-here"
method = "POST"
path = "/api/license/status"
payload = {
    "projectKey": "desktop-app",
    "code": "A1B2C3D4E5F6G7H8",
    "machineId": "machine-001",
}

body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
timestamp = str(int(time.time()))
nonce = str(uuid.uuid4())
body_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
canonical = "\n".join([method, path, timestamp, nonce, body_hash])
signature = hmac.new(
    api_secret.encode("utf-8"),
    canonical.encode("utf-8"),
    hashlib.sha256,
).hexdigest()

headers = {
    "Content-Type": "application/json",
    "X-License-Timestamp": timestamp,
    "X-License-Nonce": nonce,
    "X-License-Signature": signature,
    "X-License-Signature-Version": "v1",
}`

  const languageSnippets: ApiLanguageSnippet[] = [
    {
      key: 'python',
      label: 'Python 桌面客户端最小示例',
      description: '适合 PyQt、Tkinter、Flet、命令行工具等 Python 客户端。示例包含 machineId 持久化和 API Secret 签名。',
      code: String.raw`import hashlib
import hmac
import json
import time
import uuid
from pathlib import Path
from urllib.parse import urlparse

import requests

BASE_URL = "https://your-domain.com"
PROJECT_KEY = "desktop-app"
API_SECRET = "paste-project-api-secret-here"
APP_NAME = "MyDesktopApp"


def get_machine_id() -> str:
    config_dir = Path.home() / ".config" / APP_NAME
    config_dir.mkdir(parents=True, exist_ok=True)
    machine_file = config_dir / "machine_id.txt"

    if machine_file.exists():
        machine_id = machine_file.read_text(encoding="utf-8").strip()
        if machine_id:
            return machine_id

    machine_id = "machine-" + str(uuid.uuid4())
    machine_file.write_text(machine_id, encoding="utf-8")
    return machine_id


def signed_post(path: str, payload: dict) -> dict:
    url = BASE_URL.rstrip("/") + path
    body_payload = {"projectKey": PROJECT_KEY, **payload}
    body = json.dumps(body_payload, separators=(",", ":"), ensure_ascii=False)

    timestamp = str(int(time.time()))
    nonce = str(uuid.uuid4())
    body_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
    canonical = "\n".join(["POST", urlparse(url).path, timestamp, nonce, body_hash])
    signature = hmac.new(
        API_SECRET.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    response = requests.post(
        url,
        data=body.encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-License-Timestamp": timestamp,
            "X-License-Nonce": nonce,
            "X-License-Signature": signature,
            "X-License-Signature-Version": "v1",
        },
        timeout=10,
    )
    return response.json()


machine_id = get_machine_id()
code = input("请输入激活码: ").strip()

activate = signed_post("/api/license/activate", {
    "code": code,
    "machineId": machine_id,
})
print("activate:", activate)

status = signed_post("/api/license/status", {
    "code": code,
    "machineId": machine_id,
})
print("status:", status)

consume = signed_post("/api/license/consume", {
    "code": code,
    "machineId": machine_id,
    "requestId": str(uuid.uuid4()),
})
print("consume:", consume)`,
    },
    {
      key: 'curl',
      label: 'cURL 快速看接口',
      description: '适合临时查看请求体结构。若项目启用了 API Secret，正式请求仍需要带签名头。',
      code: String.raw`# activate: 用户输入激活码后调用
curl -X POST "https://your-domain.com/api/license/activate" \
  -H "Content-Type: application/json" \
  -d '{
    "projectKey": "desktop-app",
    "code": "A1B2C3D4E5F6G7H8",
    "machineId": "machine-001"
  }'

# status: 程序启动时查询授权
curl -X POST "https://your-domain.com/api/license/status" \
  -H "Content-Type: application/json" \
  -d '{
    "projectKey": "desktop-app",
    "code": "A1B2C3D4E5F6G7H8",
    "machineId": "machine-001"
  }'

# consume: 次数卡真实使用成功后调用
curl -X POST "https://your-domain.com/api/license/consume" \
  -H "Content-Type: application/json" \
  -d '{
    "projectKey": "desktop-app",
    "code": "A1B2C3D4E5F6G7H8",
    "machineId": "machine-001",
    "requestId": "req-001"
  }'`,
    },
    {
      key: 'sdk',
      label: 'JavaScript / TypeScript SDK',
      description: '适合浏览器插件、Electron、Tauri 或 Node 项目。Python 客户端可直接参考上面的签名规则。',
      code: String.raw`import { createLicenseClient } from '@/lib/license-sdk'

const client = createLicenseClient({
  baseUrl: 'https://your-domain.com',
  projectKey: 'desktop-app',
  apiSecret: 'paste-project-api-secret-here',
  timeoutMs: 10000,
})

await client.activate({
  code: 'A1B2C3D4E5F6G7H8',
  machineId: 'machine-001',
})

await client.status({
  code: 'A1B2C3D4E5F6G7H8',
  machineId: 'machine-001',
})

await client.consume({
  code: 'A1B2C3D4E5F6G7H8',
  machineId: 'machine-001',
  requestId: crypto.randomUUID(),
})`,
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
