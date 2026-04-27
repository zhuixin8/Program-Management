import assert from 'node:assert/strict'
import test from 'node:test'

import {
  evaluateLicenseV2FingerprintBinding,
  readLicenseV2FingerprintHash,
} from '../src/lib/license-v2-service'

test('License v2 会读取 camelCase 和 snake_case 设备指纹字段', () => {
  assert.equal(readLicenseV2FingerprintHash({ fingerprintHash: ' fp_a ' }), 'fp_a')
  assert.equal(readLicenseV2FingerprintHash({ fingerprint_hash: ' fp_b ' }), 'fp_b')
  assert.equal(readLicenseV2FingerprintHash({ fingerprintHash: '', fingerprint_hash: ' fp_b ' }), 'fp_b')
  assert.equal(readLicenseV2FingerprintHash({ fingerprintHash: '   ' }), null)
})

test('License v2 设备指纹绑定会拒绝缺失或漂移的后续请求', () => {
  assert.deepEqual(
    evaluateLicenseV2FingerprintBinding({
      storedFingerprintHash: 'fp_original',
      requestFingerprintHash: null,
    }),
    {
      ok: false,
      reason: 'missing',
      eventType: 'FINGERPRINT_HASH_MISSING',
      message: '设备指纹校验缺失，请升级客户端或重新激活',
    },
  )

  assert.deepEqual(
    evaluateLicenseV2FingerprintBinding({
      storedFingerprintHash: 'fp_original',
      requestFingerprintHash: 'fp_other',
    }),
    {
      ok: false,
      reason: 'drift',
      eventType: 'FINGERPRINT_DRIFT_DETECTED',
      message: '设备指纹发生变化，请重新激活或联系管理员',
    },
  )

  assert.deepEqual(
    evaluateLicenseV2FingerprintBinding({
      storedFingerprintHash: null,
      requestFingerprintHash: 'fp_new',
    }),
    {
      ok: true,
      reason: 'bind',
      shouldBind: true,
    },
  )

  assert.deepEqual(
    evaluateLicenseV2FingerprintBinding({
      storedFingerprintHash: 'fp_original',
      requestFingerprintHash: 'fp_original',
    }),
    {
      ok: true,
      reason: 'matched',
      shouldBind: false,
    },
  )
})
