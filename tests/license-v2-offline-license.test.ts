import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'

import {
  buildLicenseV2OfflineLicensePayload,
  getLicenseV2OfflinePublicKey,
  signLicenseV2OfflineLicense,
  verifyLicenseV2OfflineLicense,
} from '../src/lib/license-v2-offline-license'
import { generateLicenseV2OfflineKeyPair } from '../src/lib/license-v2-offline-keypair'

function withOfflineSigningKey<T>(callback: (publicKey: string) => T) {
  const previousPem = process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_PEM
  const previousBase64 = process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64
  const previousPublicKey = process.env.LICENSE_V2_OFFLINE_PUBLIC_KEY
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const privatePem = privateKey.export({ format: 'pem', type: 'pkcs8' }) as string
  const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
  const rawPublicKey = publicKeyDer.subarray(-32).toString('base64url')

  process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_PEM = privatePem
  delete process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64
  delete process.env.LICENSE_V2_OFFLINE_PUBLIC_KEY

  try {
    return callback(rawPublicKey)
  } finally {
    if (previousPem === undefined) {
      delete process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_PEM
    } else {
      process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_PEM = previousPem
    }

    if (previousBase64 === undefined) {
      delete process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64
    } else {
      process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64 = previousBase64
    }

    if (previousPublicKey === undefined) {
      delete process.env.LICENSE_V2_OFFLINE_PUBLIC_KEY
    } else {
      process.env.LICENSE_V2_OFFLINE_PUBLIC_KEY = previousPublicKey
    }
  }
}

test('License v2 离线授权会使用服务端 Ed25519 私钥签名并能用公钥验证', () => {
  withOfflineSigningKey((publicKey) => {
    const payload = buildLicenseV2OfflineLicensePayload({
      issuedAt: '2026-04-27T00:00:00.000Z',
      notBefore: '2026-04-27T00:00:00.000Z',
      expiresAt: '2026-04-28T00:00:00.000Z',
      projectKey: 'desktop-suite',
      activationCodeId: 7,
      deviceId: 11,
      sessionId: 'ls_123',
      machineId: 'machine-001',
      publicKeyFingerprint: 'fingerprint',
      fingerprintHash: 'fingerprint-hash',
      appVersion: '1.0.0',
      tokenVersion: 2,
      licenseMode: 'COUNT',
      licenseExpiresAt: null,
      remainingCount: 5,
      valid: true,
    })

    const signedLicense = signLicenseV2OfflineLicense(payload)

    assert.ok(signedLicense)
    assert.equal(getLicenseV2OfflinePublicKey(), publicKey)
    assert.equal(signedLicense?.publicKey, publicKey)
    assert.deepEqual(
      verifyLicenseV2OfflineLicense({
        license: signedLicense!.license,
        publicKey,
        now: new Date('2026-04-27T12:00:00.000Z'),
      }),
      payload,
    )
  })
})

test('License v2 离线授权会拒绝篡改和过期 license file', () => {
  withOfflineSigningKey((publicKey) => {
    const payload = buildLicenseV2OfflineLicensePayload({
      issuedAt: '2026-04-27T00:00:00.000Z',
      notBefore: '2026-04-27T00:00:00.000Z',
      expiresAt: '2026-04-28T00:00:00.000Z',
      projectKey: 'desktop-suite',
      activationCodeId: 7,
      deviceId: 11,
      sessionId: 'ls_123',
      machineId: 'machine-001',
      publicKeyFingerprint: 'fingerprint',
      fingerprintHash: 'fingerprint-hash',
      appVersion: '1.0.0',
      tokenVersion: 2,
      licenseMode: 'TIME',
      licenseExpiresAt: '2026-04-28T00:00:00.000Z',
      remainingCount: null,
      valid: true,
    })
    const signedLicense = signLicenseV2OfflineLicense(payload)

    assert.ok(signedLicense)
    assert.equal(
      verifyLicenseV2OfflineLicense({
        license: `${signedLicense!.license}tampered`,
        publicKey,
        now: new Date('2026-04-27T12:00:00.000Z'),
      }),
      null,
    )
    assert.equal(
      verifyLicenseV2OfflineLicense({
        license: signedLicense!.license,
        publicKey,
        now: new Date('2026-04-29T00:00:00.000Z'),
      }),
      null,
    )
  })
})

test('License v2 离线授权优先使用项目级签名密钥', () => {
  const previousPem = process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_PEM
  const previousBase64 = process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64
  const previousPublicKey = process.env.LICENSE_V2_OFFLINE_PUBLIC_KEY
  const keyPair = generateLicenseV2OfflineKeyPair()

  delete process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_PEM
  delete process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64
  delete process.env.LICENSE_V2_OFFLINE_PUBLIC_KEY

  try {
    const payload = buildLicenseV2OfflineLicensePayload({
      issuedAt: '2026-04-27T00:00:00.000Z',
      notBefore: '2026-04-27T00:00:00.000Z',
      expiresAt: '2026-04-28T00:00:00.000Z',
      projectKey: 'project-scoped',
      activationCodeId: 17,
      deviceId: 23,
      sessionId: 'ls_project',
      machineId: 'machine-project',
      publicKeyFingerprint: 'fingerprint-project',
      fingerprintHash: 'fingerprint-hash-project',
      appVersion: '2.0.0',
      tokenVersion: 1,
      licenseMode: 'TIME',
      licenseExpiresAt: '2026-04-28T00:00:00.000Z',
      remainingCount: null,
      valid: true,
    })
    const signedLicense = signLicenseV2OfflineLicense(payload, {
      privateKeyBase64: keyPair.privateKeyBase64,
      publicKey: keyPair.publicKey,
    })

    assert.ok(signedLicense)
    assert.equal(getLicenseV2OfflinePublicKey({
      privateKeyBase64: keyPair.privateKeyBase64,
      publicKey: keyPair.publicKey,
    }), keyPair.publicKey)
    assert.equal(signedLicense?.publicKey, keyPair.publicKey)
    assert.deepEqual(
      verifyLicenseV2OfflineLicense({
        license: signedLicense!.license,
        publicKey: keyPair.publicKey,
        now: new Date('2026-04-27T12:00:00.000Z'),
      }),
      payload,
    )
  } finally {
    if (previousPem === undefined) {
      delete process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_PEM
    } else {
      process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_PEM = previousPem
    }

    if (previousBase64 === undefined) {
      delete process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64
    } else {
      process.env.LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64 = previousBase64
    }

    if (previousPublicKey === undefined) {
      delete process.env.LICENSE_V2_OFFLINE_PUBLIC_KEY
    } else {
      process.env.LICENSE_V2_OFFLINE_PUBLIC_KEY = previousPublicKey
    }
  }
})
