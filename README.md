# Program Management / Activation Manager

面向插件、桌面客户端、内部工具和 SaaS 产品的激活码授权管理系统。项目提供激活码生成、设备绑定、授权查询、次数扣减、消费日志、项目隔离、REST API 文档和管理后台，适合把“软件授权 / 会员权益 / 次数卡 / 试用期”集中到一个可部署的服务中管理。

当前版本已经完成 Next.js 15 升级和一轮安全加固，支持项目级 API 签名、License API 限速、128 bit 激活码、JWT 版本吊销、安全响应头和 Docker 本地部署。

## 功能概览

- 项目管理：为不同产品、插件或客户创建独立 `projectKey`，隔离激活码、消费日志和统计数据。
- 激活码管理：支持 TIME 有效期授权和 COUNT 次数授权，批量生成、查询、绑定、释放和清理。
- 设备绑定：激活码首次使用时绑定 `machineId`，后续请求按项目和设备校验。
- 授权接口：提供 `/api/license/activate`、`/api/license/status`、`/api/license/consume` 和旧版 `/api/verify`。
- 幂等扣次：`consume` 支持 `requestId`，网络重试不会重复扣减次数。
- 管理后台：包含数据统计、项目管理、激活码列表、消费日志、审计日志、系统配置和修改密码。
- API 文档中心：Apifox 风格 REST API 页面，包含字段、响应、SDK、Python、cURL 和签名示例。
- Docker 部署：内置 SQLite 数据持久化、运行时初始化、健康检查和 Docker Compose。

## 安全能力

- Next.js `15.5.15`，完整 `npm audit` 为 0 vulnerabilities。
- 每个项目拥有独立 `apiSecret`，License API 使用 HMAC-SHA256 请求签名。
- 签名请求校验 timestamp、nonce 和 body hash，防止重放。
- License API 默认按 `IP + projectKey + path` 每分钟限速 120 次。
- 激活码生成使用 16 字节随机数，等价 128 bit 熵。
- 管理员修改密码后递增 `tokenVersion`，旧 JWT 自动失效。
- 管理后台支持 IP 白名单，生产环境可用 `ALLOWED_IPS` 作为最终访问控制来源。
- 默认响应头包含 CSP、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、Referrer-Policy、Permissions-Policy 和 HSTS。

## 技术栈

- Next.js App Router
- React 18
- TypeScript
- Prisma 5
- SQLite
- Tailwind CSS
- Node.js 22
- Docker / Docker Compose

## 快速启动

要求：

- Node.js 22 或更高版本
- npm
- 本地开发建议安装 SQLite CLI；Docker 部署镜像内已包含 SQLite

```bash
npm ci
cp .env.example .env
npm run db:generate
npm run dev
```

启动后访问：

- 首页：`http://127.0.0.1:3000`
- API 文档：`http://127.0.0.1:3000/docs/api`
- 管理后台：`http://127.0.0.1:3000/admin/login`

开发环境初始化会创建默认管理员：

```text
username: admin
password: 123456
```

生产或公网环境必须先修改默认密码，并替换 `.env` 中的 `JWT_SECRET`。

## Docker 部署

复制环境变量示例：

```bash
cp .env.docker.example .env
```

编辑 `.env`，至少替换：

```env
JWT_SECRET=replace-with-a-long-random-secret
PORT=3000
ALLOWED_IPS=127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

使用 Docker Compose：

```bash
docker compose up -d --build
```

或直接使用 Docker：

```bash
docker build -t activation-manager:local .
docker run -d --init \
  --name activation-manager \
  --restart unless-stopped \
  --env-file .env \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -p 3000:3000 \
  -v activation_manager_data:/app/data \
  activation-manager:local
```

查看状态：

```bash
docker ps --filter name=activation-manager
docker logs --tail 80 activation-manager
```

数据保存在 Docker volume `activation_manager_data` 中。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `JWT_SECRET` | 无 | 生产环境必填，用于签发和校验管理后台 JWT |
| `PORT` | `3000` | Next.js 服务端口 |
| `ALLOWED_IPS` | `127.0.0.1,::1` | 管理后台访问白名单，支持 CIDR 和 `*` |
| `LICENSE_API_RATE_LIMIT_MAX` | `120` | License API 单窗口最大请求数 |
| `LICENSE_API_RATE_LIMIT_WINDOW_SECONDS` | `60` | License API 限速窗口秒数 |
| `NEXT_DIST_DIR` | `.next-build` | 构建输出目录，由启动脚本统一设置 |

`.env`、数据库文件、构建产物和本地截图不会提交到 Git。

## License API 签名

新建项目后，管理后台会为每个项目生成独立 `apiSecret`。正式 License API 请求需要携带以下请求头：

```text
X-License-Timestamp
X-License-Nonce
X-License-Signature
X-License-Signature-Version: v1
```

签名串：

```text
METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + NONCE + "\n" + SHA256(rawBody)
```

签名算法：

```text
HMAC-SHA256 hex, key = project.apiSecret
```

Node.js 示例：

```ts
import crypto from 'node:crypto'

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
const signature = crypto.createHmac('sha256', apiSecret).update(canonicalInput).digest('hex')
```

如果项目配置了 `apiSecret`，未签名请求会返回 `401`。

## REST API

推荐流程：

```text
activate -> status -> consume
```

核心接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/license/activate` | 首次激活并绑定设备 |
| `POST` | `/api/license/status` | 查询授权状态，不扣减次数 |
| `POST` | `/api/license/consume` | 真实业务完成后消费一次授权额度 |
| `POST` | `/api/verify` | 旧客户端兼容入口 |

公共请求字段：

| 字段 | 说明 |
| --- | --- |
| `projectKey` / `project_key` | 项目标识，不传时使用 `default` |
| `code` | 激活码正文 |
| `machineId` / `machine_id` | 客户端稳定设备标识 |
| `requestId` / `request_id` | `consume` 幂等键，建议每次业务动作都传 |

更多字段和示例请打开 `/docs/api`。

## 常用脚本

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run quality:gate
npm run db:generate
npm run db:push
npm run smoke:license-api
```

说明：

- `npm run dev` 会先执行开发环境初始化。
- `npm run build` 使用 `.next-build` 作为构建目录。
- `npm run quality:gate` 会执行 lint、覆盖率测试和生产构建。
- `npm run smoke:license-api` 会跑一条登录、建项目、发码、激活、查询、扣次的冒烟链路。

## 目录结构

```text
src/app                 Next.js 页面和 API Route
src/components          前台、文档中心和后台 UI 组件
src/lib                 业务服务、鉴权、签名、SDK、统计和工具函数
prisma/schema.prisma    SQLite 数据模型
scripts                 初始化、备份、Docker entrypoint 和 smoke 脚本
tests                   Node test 单元测试和业务流程测试
.github/workflows       质量门禁和 Docker 发布工作流
```

## GitHub Actions

仓库内置两个工作流：

- `Quality Gate`：安装 SQLite 和 Node 依赖后运行 `npm run quality:gate`。
- `Docker Publish`：质量门禁通过后执行 Docker Compose 冒烟测试，并可推送 Docker Hub 镜像。

如需启用 Docker Hub 发布，需要在 GitHub 仓库配置：

```text
secrets.DOCKERHUB_USERNAME
secrets.DOCKERHUB_TOKEN
vars.DOCKERHUB_IMAGE_NAME
```

## 生产建议

- 立即修改默认管理员密码。
- 使用足够长的随机 `JWT_SECRET`。
- 收紧 `ALLOWED_IPS`，不要长期使用 `*`。
- 通过 HTTPS 或反向代理对外暴露服务。
- 给不同产品创建独立 projectKey，不要共用默认项目。
- 客户端保存稳定 `machineId`，不要每次启动重新生成。
- `consume` 始终传 `requestId`，避免网络重试导致重复扣次。
- 定期备份 `/app/data/dev.db` 或 Docker volume。

## 备份

Docker volume 场景可以导出 SQLite：

```bash
docker exec activation-manager sqlite3 /app/data/dev.db ".backup '/app/data/backup.db'"
```

本地开发可使用：

```bash
npm run db:backup
```

备份文件不要提交到 Git。
