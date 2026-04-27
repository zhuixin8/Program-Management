import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'

import {
  buildLicenseV2ChallengeMessage,
  buildLicenseV2EnrollMessage,
  buildLicenseV2ProofMessage,
  getEd25519PublicKeyFingerprint,
  normalizeEd25519PublicKey,
  sha256Hex,
  verifyEd25519Signature,
} from '../src/lib/license-v2-crypto'

function createEd25519Fixture() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
  const rawPublicKey = publicKeyDer.subarray(-32).toString('base64url')

  return {
    publicKey: rawPublicKey,
    sign: (message: string) =>
      crypto.sign(null, Buffer.from(message), privateKey).toString('base64url'),
  }
}

test('license v2 Ed25519 工具会校验 raw base64url 公钥并验证签名', () => {
  const fixture = createEd25519Fixture()
  const message = 'hello-license-v2'
  const signature = fixture.sign(message)

  assert.equal(normalizeEd25519PublicKey(` ${fixture.publicKey} `), fixture.publicKey)
  assert.equal(verifyEd25519Signature({ publicKey: fixture.publicKey, signature, message }), true)
  assert.equal(
    verifyEd25519Signature({
      publicKey: fixture.publicKey,
      signature,
      message: 'tampered',
    }),
    false,
  )
})

test('license v2 公钥指纹使用 raw 公钥 SHA-256，便于后台识别设备密钥', () => {
  const fixture = createEd25519Fixture()
  const expectedFingerprint = crypto
    .createHash('sha256')
    .update(Buffer.from(fixture.publicKey, 'base64url'))
    .digest('hex')

  assert.equal(getEd25519PublicKeyFingerprint(fixture.publicKey), expectedFingerprint)
})

test('license v2 canonical message 会绑定方法、路径、session、nonce、body 和 token', () => {
  assert.equal(
    buildLicenseV2EnrollMessage({
      method: 'post',
      path: '/api/license/v2/enroll',
      projectKey: 'desktop-suite',
      code: 'ABC-123',
      machineId: 'machine-001',
      appVersion: '1.0.0',
      devicePublicKey: 'pub_key',
      fingerprintHash: 'fp_hash',
    }),
    [
      'LICENSE-V2-ENROLL',
      'POST',
      '/api/license/v2/enroll',
      'desktop-suite',
      'ABC-123',
      'machine-001',
      '1.0.0',
      'pub_key',
      'fp_hash',
    ].join('\n'),
  )

  assert.equal(
    buildLicenseV2ChallengeMessage({
      method: 'post',
      path: '/api/license/v2/renew',
      sessionId: 'ls_123',
      challengeId: 'lc_456',
      nonce: 'nonce_789',
    }),
    [
      'LICENSE-V2-CHALLENGE',
      'POST',
      '/api/license/v2/renew',
      'ls_123',
      'lc_456',
      'nonce_789',
    ].join('\n'),
  )

  assert.equal(
    buildLicenseV2ProofMessage({
      method: 'post',
      path: '/api/license/v2/consume',
      sessionId: 'ls_123',
      timestamp: '1777000000',
      nonce: 'req_nonce',
      bodyHash: sha256Hex('{"requestId":"req-1"}'),
      tokenHash: sha256Hex('token'),
    }),
    [
      'LICENSE-V2-PROOF',
      'POST',
      '/api/license/v2/consume',
      'ls_123',
      '1777000000',
      'req_nonce',
      sha256Hex('{"requestId":"req-1"}'),
      sha256Hex('token'),
    ].join('\n'),
  )
})
