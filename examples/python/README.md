# Python License v2 Client

这个示例演示新版高强度授权流程：Python 客户端不再内置项目 API Secret，而是在本机生成 Ed25519 设备密钥，用私钥证明“当前请求来自已登记设备”。正式客户端还可以传入本地计算的 `fingerprintHash`，服务端会用它检测设备指纹漂移。

## 安装

```powershell
python -m pip install -r examples\python\requirements.txt
```

`keyring` 会优先把设备私钥放进系统凭据库；如果当前系统没有可用 keyring backend，示例会退回到 `~/.activation-manager/license-v2/device-*.pem`。文件存储只适合开发调试，正式客户端建议使用 Windows DPAPI、macOS Keychain、Linux Secret Service，或硬件安全模块/TPM。

## 快速试跑

先启动本项目服务端，然后把激活码、项目 key、机器 ID 换成你的真实值：

```powershell
python examples\python\license_v2_client.py demo `
  --base-url http://127.0.0.1:3000 `
  --project-key your-project-key `
  --code YOUR-ACTIVATION-CODE `
  --machine-id test-machine-001 `
  --app-version 1.0.0 `
  --fingerprint-hash sha256-of-device-fingerprint
```

后续可直接使用本地保存的短期 session：

```powershell
python examples\python\license_v2_client.py renew --base-url http://127.0.0.1:3000 --project-key your-project-key --machine-id test-machine-001 --fingerprint-hash sha256-of-device-fingerprint
python examples\python\license_v2_client.py status --base-url http://127.0.0.1:3000 --project-key your-project-key --machine-id test-machine-001 --fingerprint-hash sha256-of-device-fingerprint
python examples\python\license_v2_client.py consume --base-url http://127.0.0.1:3000 --project-key your-project-key --machine-id test-machine-001 --fingerprint-hash sha256-of-device-fingerprint --request-id order-10001
```

后台创建项目时会自动生成项目级 License v2 离线公钥。`enroll`、`renew`、`status`、`consume` 响应会额外返回 `offlineLicense`，客户端可在短暂断网时用该项目公钥验证这个短期离线授权快照：

```powershell
python examples\python\license_v2_client.py offline-status `
  --base-url http://127.0.0.1:3000 `
  --project-key your-project-key `
  --machine-id test-machine-001 `
  --fingerprint-hash sha256-of-device-fingerprint `
  --offline-public-key base64url-ed25519-public-key
```

## 协议流程

1. `POST /api/license/v2/enroll`：客户端提交激活码、机器 ID、appVersion、fingerprintHash、Ed25519 公钥，并用设备私钥签名注册消息；服务端验证私钥持有证明后绑定设备并下发短期 `licenseToken`。
2. `POST /api/license/v2/challenge`：客户端用 `sessionId`、短期 token 和 fingerprintHash 请求一次性 challenge。
3. `POST /api/license/v2/renew`：客户端用设备私钥签名 challenge，服务端复核 fingerprintHash 后续租 session 并刷新 token。
4. `POST /api/license/v2/status` 和 `POST /api/license/v2/consume`：每次请求都带短期 token 和 fingerprintHash，并用设备私钥签名方法、路径、session、时间戳、nonce、请求体 hash 和 token hash。
5. 可选 `offlineLicense`：服务端项目级私钥签发短期离线授权快照，客户端固定该项目公钥验证签名、设备指纹和授权状态。它适合弱网宽限和本地只读状态，不适合在离线状态下做可信的 COUNT 扣次。

这套方案的重点是把信任边界收回服务端：逆向者即使拿到 Python 代码，也拿不到项目 API Secret；复制 token 会被短 TTL、session 版本、设备公钥签名、设备指纹漂移检测和 nonce 防重放限制住。
