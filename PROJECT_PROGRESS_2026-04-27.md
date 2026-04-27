# 2026-04-27 项目说明与开发进度

## 项目定位

Activation Manager 是一个面向 Python 桌面程序、插件、内部工具和 SaaS 产品的授权管理系统。当前核心目标是把客户端本地激活码校验改造为服务端可信授权体系，降低 Python 程序被逆向后复制 API Secret、伪造授权、重放请求或离线篡改授权状态的风险。

项目当前提供：

- 多项目隔离：每个产品使用独立 `projectKey`、激活码、统计数据和 License v2 离线公钥。
- 双授权模型：`TIME` 时间授权和 `COUNT` 次数授权。
- 新版 License v2 接入：`enroll -> challenge / renew -> status / consume`。
- 旧版接口兼容：保留 `/api/license/*` 和 `/api/verify` 给历史客户端。
- 管理后台：项目管理、激活码管理、消费日志、审计日志、License v2 设备 / session / 安全事件管理。
- API 文档中心：`/docs/api` 展示新版与旧版接口、字段说明、Python 示例和接入流程。

## 今日开发重点

今天围绕“商业授权系统”的设计思路，完成了 License v2 的高强度验证加固、文档补齐、依赖安全修复和服务器部署。

### 1. 项目级离线签名密钥

已将 License v2 离线授权从全站环境变量密钥升级为项目级密钥。

- 后台创建项目时自动生成 Ed25519 离线签名 key pair。
- 项目列表展示 `licenseV2OfflinePublicKey`，用于客户端固定公钥验签。
- 项目私钥仅服务端保存，不通过后台接口返回。
- 老项目在启动初始化时自动补齐项目级离线密钥。
- 环境变量 `LICENSE_V2_OFFLINE_*` 仍保留为兜底兼容方案。

相关提交：

- `50825b0 feat: add project scoped offline license keys`

### 2. 设备指纹漂移检测

新增 `fingerprintHash / fingerprint_hash` 设备指纹绑定机制，接近商业授权系统中的 HostID / node-locked license 思路。

- `enroll` 可提交 `fingerprintHash` 并绑定设备。
- `challenge`、`renew`、`status`、`consume` 会复核指纹。
- 已绑定指纹后，后续请求缺失或不一致会返回 403。
- 服务端记录安全事件：
  - `FINGERPRINT_HASH_BOUND`
  - `FINGERPRINT_HASH_MISSING`
  - `FINGERPRINT_DRIFT_DETECTED`
- 指纹字段参与签名请求的 body hash，防止中间人改写。

相关提交：

- `93f287e feat: enforce license v2 fingerprint binding`

### 3. 离线授权快照增强

`offlineLicense` 现在包含设备指纹信息，客户端离线校验不只验证签名和有效期，还可以验证设备身份。

已覆盖字段：

- `projectKey`
- `activationCodeId`
- `deviceId`
- `sessionId`
- `machineId`
- `publicKeyFingerprint`
- `fingerprintHash`
- `appVersion`
- `tokenVersion`
- `licenseMode`
- `remainingCount`
- `valid`
- `expiresAt`

Python 示例客户端已支持：

```bash
python examples/python/license_v2_client.py demo \
  --base-url https://mi.gxslgg.cn \
  --project-key your-project-key \
  --code YOUR-ACTIVATION-CODE \
  --machine-id machine-001 \
  --app-version 1.0.0 \
  --fingerprint-hash sha256-of-device-fingerprint
```

### 4. API 文档更新

线上 API 文档已更新：

- 地址：https://mi.gxslgg.cn/docs/api
- 新版 License v2 与旧版兼容接口分开展示。
- 接入流程补充项目级离线公钥、设备指纹、短期 token、签名请求、防重放、离线宽限。
- 字段说明新增 `fingerprintHash / fingerprint_hash`。
- Python 示例新增 `--fingerprint-hash`。

### 5. 依赖与 Docker 构建安全

处理了 PostCSS 相关 npm audit advisory。

- `package.json` 增加 `next -> postcss@8.5.10` override。
- devDependency `postcss` 提升到 `^8.5.10`。
- 本地 `npm audit --omit=dev` 结果为 0 vulnerabilities。
- Docker 镜像内 Next 依赖的 PostCSS 已确认为 `8.5.10`。

为了避免服务器构建卡在 npm 官方源或 audit 请求：

- Dockerfile 中 `npm ci` 改为 `npm ci --audit=false --fund=false`。
- Dockerfile 支持 `NPM_CONFIG_REGISTRY` build arg。
- 服务器构建时使用 `https://registry.npmmirror.com` 加速依赖安装。

相关提交：

- `f695df0 chore: patch postcss audit advisory`
- `4a6728d chore: make docker npm install non-auditing`
- `264ded1 chore: allow docker npm registry override`

## 今日验证结果

本地验证：

- `npm run build` 通过。
- License v2 指纹绑定测试通过。
- License v2 离线授权测试通过。
- License v2 加密 canonical message 测试通过。
- API 文档模型测试通过。
- `python -m py_compile examples/python/license_v2_client.py` 通过。
- `npm audit --omit=dev` 为 0 vulnerabilities。

服务器验证：

- Docker 镜像构建通过。
- `npm prune --omit=dev` 显示 `found 0 vulnerabilities`。
- 容器 `activation-manager` 状态为 healthy。
- 当前线上镜像：`activation-manager:fingerprint-drift-264ded1`。
- 数据库已确认存在：
  - `license_devices.fingerprintHash`
  - `projects.licenseV2OfflinePrivateKeyBase64`
  - `projects.licenseV2OfflinePublicKey`
  - `projects.licenseV2OfflineKeyCreatedAt`
- 线上 `/docs/api` 已确认包含：
  - `fingerprintHash`
  - 项目级离线公钥说明
  - 新版 License v2 / 旧版兼容接口分组

## 当前接入建议

新 Python 客户端建议使用 License v2，不再内置项目 `apiSecret`。

推荐流程：

1. 后台创建项目，复制项目级 `projectKey` 和 License v2 离线公钥。
2. 客户端首次运行生成稳定 `machineId`、设备私钥和 `fingerprintHash`。
3. 用户输入激活码后调用 `/api/license/v2/enroll`。
4. 客户端保存短期 `licenseToken`、`sessionId` 和 `offlineLicense`。
5. 启动时调用 `/api/license/v2/status`，请求体携带 `fingerprintHash` 并签名。
6. 次数卡真实业务完成后调用 `/api/license/v2/consume`，传 `requestId` 和 `fingerprintHash`。
7. token 快过期时调用 `/api/license/v2/challenge` 和 `/api/license/v2/renew`。
8. 短暂断网时可用 `offlineLicense` 做只读宽限校验，联网后恢复在线校验。

## 商业系统参考点

今天借鉴的商业授权系统思路：

- Keygen：离线 license 文件使用签名证书，客户端固定公钥验签。
- Cryptlex：node-locked license 在激活时生成设备指纹，并由服务端存储用于后续激活和校验。
- Flexera：Trusted Storage 强调机器绑定、锚定、防篡改和恢复检测。

对应到本项目已经落地：

- 项目级 Ed25519 离线签名密钥。
- 设备 Ed25519 私钥持有证明。
- 短期 token + session tokenVersion。
- nonce 防重放。
- `fingerprintHash` 设备指纹漂移检测。
- 安全事件审计。
- 离线签名授权快照。

## 后续可继续优化

建议下一阶段继续补强：

- 账号体系：客户账号、设备列表、自助解绑、管理员审批。
- 指纹策略：多因子指纹、容忍阈值、虚拟机 / 克隆环境标记。
- 客户端安全：混淆、关键逻辑 native 扩展、反调试、完整性校验。
- 风控策略：异常 IP、短时间多设备激活、重复漂移、签名失败频率限制。
- 离线策略：离线宽限次数、最长离线天数、时钟回拨检测。
- 运营能力：客户门户、订单 / 套餐 / 授权席位、续费与到期提醒。

## GitHub 提交范围

今日关键提交范围：

```text
50825b0 feat: add project scoped offline license keys
93f287e feat: enforce license v2 fingerprint binding
f695df0 chore: patch postcss audit advisory
4a6728d chore: make docker npm install non-auditing
264ded1 chore: allow docker npm registry override
```
