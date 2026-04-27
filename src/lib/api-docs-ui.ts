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
  key:
    | 'v2-enroll'
    | 'v2-challenge'
    | 'v2-renew'
    | 'v2-status'
    | 'v2-consume'
    | 'activate'
    | 'status'
    | 'consume'
    | 'verify'
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
      label: '推荐接入',
      value: 'License v2',
      description: 'Python 客户端不再内置 API Secret；本机生成 Ed25519 设备密钥，服务端只保存公钥。',
      tone: 'sky',
    },
    {
      label: '高强度流程',
      value: '5 个接口',
      description: 'enroll 绑定设备，challenge / renew 续租短期 token，status / consume 每次请求都签名。',
      tone: 'emerald',
    },
    {
      label: '兼容接口',
      value: 'v1 / verify',
      description: 'HMAC API Secret 模式只给历史客户端兼容；新 Python 程序优先迁移到 License v2。',
      tone: 'violet',
    },
  ]

  const researchSteps: ApiResearchStep[] = [
    {
      step: '01',
      title: '后台创建项目和激活码',
      description: '在后台项目管理里创建项目，生成 TIME 或 COUNT 激活码。License v2 客户端只需要 Base URL、projectKey 和用户输入的激活码。',
      outcome: 'API Secret 不再放进 Python 客户端；密钥信任边界留在服务端。',
    },
    {
      step: '02',
      title: '客户端生成设备密钥和 machineId',
      description: 'Python 程序首次运行时生成稳定 machineId 和 Ed25519 私钥。私钥保存在系统钥匙串、DPAPI、Keychain 或安全文件存储里。',
      outcome: '服务端只保存设备公钥；后续请求必须由本机私钥签名。',
    },
    {
      step: '03',
      title: '用户输入激活码后调用 enroll',
      description: '把 code、machineId、projectKey、devicePublicKey 和 deviceSignature 发到 /api/license/v2/enroll。',
      outcome: '服务端验证设备私钥持有证明，绑定设备并下发短期 licenseToken。',
    },
    {
      step: '04',
      title: '续租短期 token',
      description: 'token 快过期时先调用 /api/license/v2/challenge，再用设备私钥签名 challenge 调用 /api/license/v2/renew。',
      outcome: '短期 token 和设备签名同时存在，复制 token 不能长期绕过授权。',
    },
    {
      step: '05',
      title: '启动检查和扣次都走签名请求',
      description: '程序启动调用 /api/license/v2/status，COUNT 次数卡真实使用成功后调用 /api/license/v2/consume。',
      outcome: '每次请求都签名方法、路径、session、时间戳、nonce、请求体 hash 和 token hash，服务端防重放。',
    },
    {
      step: '06',
      title: '在后台日志里排查问题',
      description: '遇到客户反馈时，用激活码、machineId、sessionId 或安全事件在后台查询。',
      outcome: '可以确认设备是否被吊销、客户端版本是否被封禁、是否发生签名失败或 nonce 重放。',
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
    {
      field: 'devicePublicKey',
      type: 'string',
      required: 'v2 enroll 是',
      description: 'base64url 编码的 32 字节 Ed25519 公钥。服务端保存公钥，客户端保管私钥。',
    },
    {
      field: 'deviceSignature',
      type: 'string',
      required: 'v2 enroll 是',
      description: '客户端用设备私钥签名 enroll canonical message，证明持有对应私钥。',
    },
    {
      field: 'licenseToken',
      type: 'string',
      required: 'v2 challenge / signed request 是',
      description: '服务端下发的短期授权 token。正式请求建议放在 Authorization: Bearer 头里。',
    },
    {
      field: 'sessionId / challengeId / nonce / signature',
      type: 'string',
      required: 'v2 renew 是',
      description: 'challenge / renew 续租流程字段。signature 是设备私钥对服务端 signInput 的 Ed25519 签名。',
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
    {
      field: 'licenseToken',
      type: 'string',
      required: 'v2 enroll / renew 返回',
      description: 'License v2 短期 token。客户端保存后，status / consume 请求必须同时带 token 和设备签名。',
    },
    {
      field: 'sessionId / deviceId / tokenExpiresAt',
      type: 'string | number',
      required: 'v2 常用',
      description: '服务端会话、设备记录和 token 过期时间，用于续租和后台排查。',
    },
    {
      field: 'signInput',
      type: 'string',
      required: 'v2 challenge 返回',
      description: '服务端生成的一次性 challenge canonical message，客户端直接用设备私钥签名后提交 renew。',
    },
  ]

  const endpoints: ApiEndpointDoc[] = [
    {
      key: 'v2-enroll',
      title: 'License v2：设备注册和激活',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/v2/enroll',
      summary: '用户第一次输入激活码时调用。客户端提交设备公钥和私钥签名，服务端绑定设备并下发短期 token。',
      whenToUse: '新 Python 客户端、桌面程序、需要防逆向强化的正式接入都优先使用这个入口。',
      highlights: [
        '客户端不需要也不应该内置项目 API Secret。',
        'deviceSignature 会证明客户端持有 devicePublicKey 对应私钥。',
        '成功后返回 licenseToken 和 sessionId，后续 status / consume 走签名请求。',
      ],
      requestExample: `{
  "projectKey": "browser-plugin",
  "code": "A1B2C3D4E5F6G7H8",
  "machineId": "machine-001",
  "appVersion": "1.0.0",
  "devicePublicKey": "base64url-ed25519-public-key",
  "deviceSignature": "base64url-ed25519-signature"
}`,
      responseExample: `{
  "success": true,
  "message": "License v2 设备注册成功",
  "tokenType": "LicenseV2",
  "licenseToken": "eyJ...",
  "sessionId": "ls_xxx",
  "expiresAt": "2026-04-27T13:30:00.000Z",
  "deviceId": 12,
  "licenseMode": "COUNT",
  "remainingCount": 2
}`,
    },
    {
      key: 'v2-challenge',
      title: 'License v2：创建续租 challenge',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/v2/challenge',
      summary: 'token 快过期时调用，服务端返回一次性 challenge 和 signInput。',
      whenToUse: '客户端定时续租或启动后发现 token 即将过期时调用。',
      highlights: [
        '请求需要 sessionId 和短期 licenseToken。',
        'licenseToken 可放在 Authorization: Bearer 头，也可放请求体。',
        '返回的 signInput 不要自己重组，直接用设备私钥签名。',
      ],
      requestExample: `{
  "sessionId": "ls_xxx",
  "licenseToken": "eyJ..."
}`,
      responseExample: `{
  "success": true,
  "message": "License v2 challenge 创建成功",
  "sessionId": "ls_xxx",
  "challengeId": "lc_xxx",
  "nonce": "nonce_xxx",
  "expiresAt": "2026-04-27T12:35:00.000Z",
  "signInput": "LICENSE-V2-CHALLENGE\\nPOST\\n/api/license/v2/renew\\n..."
}`,
    },
    {
      key: 'v2-renew',
      title: 'License v2：续租短期 token',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/v2/renew',
      summary: '客户端用设备私钥签名 challenge 后调用，服务端验证通过后刷新 session 和 token。',
      whenToUse: 'token 过期前续租；推荐在客户端本地缓存 expiresAt，提前几分钟续租。',
      highlights: [
        'challenge 只能使用一次，过期或重复提交会被拒绝。',
        '续租成功后 tokenVersion 会递增，旧 token 立即失效。',
        '被吊销设备或被封禁版本无法续租。',
      ],
      requestExample: `{
  "sessionId": "ls_xxx",
  "challengeId": "lc_xxx",
  "nonce": "nonce_xxx",
  "signature": "base64url-ed25519-signature"
}`,
      responseExample: `{
  "success": true,
  "message": "License v2 session 续租成功",
  "tokenType": "LicenseV2",
  "licenseToken": "eyJ...",
  "sessionId": "ls_xxx",
  "expiresAt": "2026-04-27T14:30:00.000Z",
  "deviceId": 12,
  "licenseMode": "COUNT",
  "remainingCount": 2
}`,
    },
    {
      key: 'v2-status',
      title: 'License v2：签名查询授权状态',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/v2/status',
      summary: '程序启动或刷新授权页时调用。请求必须带短期 token 和设备私钥签名。',
      whenToUse: '启动检查、授权信息展示、用户点击刷新授权时调用。',
      highlights: [
        '请求头必须带 X-License-Timestamp、X-License-Nonce、X-License-Signature。',
        '签名会绑定方法、路径、session、请求体 hash 和 token hash。',
        'nonce 只能使用一次，服务端会拒绝重放请求。',
      ],
      requestExample: `POST /api/license/v2/status
Authorization: Bearer eyJ...
X-License-Session-Id: ls_xxx
X-License-Timestamp: 1777280000
X-License-Nonce: py_xxx
X-License-Signature: base64url-ed25519-signature

{}`,
      responseExample: `{
  "success": true,
  "message": "获取激活码状态成功",
  "licenseMode": "COUNT",
  "remainingCount": 2,
  "isActivated": true,
  "valid": true,
  "sessionId": "ls_xxx",
  "deviceId": 12,
  "tokenExpiresAt": "2026-04-27T14:30:00.000Z"
}`,
    },
    {
      key: 'v2-consume',
      title: 'License v2：签名扣次 / 校验权益',
      audience: 'recommended',
      method: 'POST',
      path: '/api/license/v2/consume',
      summary: 'COUNT 授权每次真实使用成功后调用一次；TIME 授权调用它只做有效性校验。',
      whenToUse: '导出、生成、分析、识别、下载等付费功能真正完成后调用。',
      highlights: [
        '请求签名规则与 v2 status 相同。',
        'COUNT 每次成功 consume 扣 1 次，requestId 支持幂等。',
        '同一个 requestId 重试不会重复扣次。',
      ],
      requestExample: `POST /api/license/v2/consume
Authorization: Bearer eyJ...
X-License-Session-Id: ls_xxx
X-License-Timestamp: 1777280000
X-License-Nonce: py_xxx
X-License-Signature: base64url-ed25519-signature

{
  "requestId": "req-001"
}`,
      responseExample: `{
  "success": true,
  "message": "激活码验证成功",
  "licenseMode": "COUNT",
  "remainingCount": 1,
  "isActivated": true,
  "valid": true,
  "idempotent": false,
  "sessionId": "ls_xxx",
  "deviceId": 12,
  "tokenExpiresAt": "2026-04-27T14:30:00.000Z"
}`,
    },
    {
      key: 'activate',
      title: '1. 激活码绑定设备',
      audience: 'compat',
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
      audience: 'compat',
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
      audience: 'compat',
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

  const signatureExample = String.raw`import base64
import hashlib
import json
import os
import time

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

private_key = Ed25519PrivateKey.generate()
license_token = "eyJ..."
session_id = "ls_xxx"
path = "/api/license/v2/status"
body = json.dumps({}, separators=(",", ":"), ensure_ascii=False)
timestamp = str(int(time.time()))
nonce = "py_" + base64.urlsafe_b64encode(os.urandom(18)).rstrip(b"=").decode("ascii")
body_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
token_hash = hashlib.sha256(license_token.encode("utf-8")).hexdigest()

canonical = "\n".join([
    "LICENSE-V2-PROOF",
    "POST",
    path,
    session_id,
    timestamp,
    nonce,
    body_hash,
    token_hash,
])
signature = base64.urlsafe_b64encode(
    private_key.sign(canonical.encode("utf-8")),
).rstrip(b"=").decode("ascii")

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {license_token}",
    "X-License-Session-Id": session_id,
    "X-License-Timestamp": timestamp,
    "X-License-Nonce": nonce,
    "X-License-Signature": signature,
}`

  const languageSnippets: ApiLanguageSnippet[] = [
    {
      key: 'python',
      label: 'Python License v2 客户端',
      description: '适合 PyQt、Tkinter、Flet、命令行工具等 Python 客户端。示例不保存 API Secret，而是本机生成 Ed25519 设备私钥。',
      code: String.raw`# 安装示例依赖
python -m pip install cryptography keyring

# 项目里已提供完整示例：
# examples/python/license_v2_client.py

python examples/python/license_v2_client.py demo \
  --base-url https://mi.gxslgg.cn \
  --project-key browser-plugin \
  --code A1B2C3D4E5F6G7H8 \
  --machine-id machine-001 \
  --app-version 1.0.0

# 真实流程：
# 1. enroll: 生成 Ed25519 设备密钥，提交公钥和私钥签名
# 2. challenge + renew: 用设备私钥续租短期 licenseToken
# 3. status / consume: 每次请求都签名 timestamp、nonce、bodyHash 和 tokenHash`,
    },
    {
      key: 'curl',
      label: 'cURL 快速看 v2 结构',
      description: '适合临时查看请求体结构。v2 的 signature 必须由客户端 Ed25519 私钥生成，正式调用请用 Python 示例或你的客户端代码签名。',
      code: String.raw`# enroll: 用户输入激活码后调用
curl -X POST "https://mi.gxslgg.cn/api/license/v2/enroll" \
  -H "Content-Type: application/json" \
  -d '{
    "projectKey": "browser-plugin",
    "code": "A1B2C3D4E5F6G7H8",
    "machineId": "machine-001",
    "appVersion": "1.0.0",
    "devicePublicKey": "base64url-ed25519-public-key",
    "deviceSignature": "base64url-ed25519-signature"
  }'

# challenge: 用 sessionId 和 token 换一次性 signInput
curl -X POST "https://mi.gxslgg.cn/api/license/v2/challenge" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{
    "sessionId": "ls_xxx"
  }'

# status / consume: 必须带 token 和设备签名头
curl -X POST "https://mi.gxslgg.cn/api/license/v2/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -H "X-License-Session-Id: ls_xxx" \
  -H "X-License-Timestamp: 1777280000" \
  -H "X-License-Nonce: py_xxx" \
  -H "X-License-Signature: base64url-ed25519-signature" \
  -d '{}'`,
    },
    {
      key: 'sdk',
      label: 'v1 JavaScript / TypeScript SDK（兼容）',
      description: '只适合仍在使用 HMAC API Secret 的历史 JS / TS 客户端。新 Python 客户端请使用 License v2 示例。',
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
    {
      title: 'License v2 安全管理',
      description: '用于管理设备密钥、短期会话、安全事件和客户端版本封禁。',
      endpoints: [
        {
          method: 'GET',
          path: '/api/admin/license-v2/devices',
          description: '分页查看 v2 设备，支持按 projectKey、状态、版本和关键词筛选。',
        },
        {
          method: 'POST',
          path: '/api/admin/license-v2/devices/{id}/revoke',
          description: '吊销异常设备，并同步吊销该设备下的活跃 session。',
        },
        {
          method: 'GET',
          path: '/api/admin/license-v2/sessions',
          description: '分页查看 v2 短期会话，排查 token 续租和过期问题。',
        },
        {
          method: 'POST',
          path: '/api/admin/license-v2/client-versions/block',
          description: '按项目封禁指定客户端版本，用于阻断已破解或存在高风险的版本。',
        },
        {
          method: 'GET',
          path: '/api/admin/license-v2/security-events',
          description: '查看签名失败、nonce 重放、版本封禁、设备吊销等安全事件。',
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
