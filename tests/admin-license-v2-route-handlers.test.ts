import assert from 'node:assert/strict'
import test from 'node:test'

import {
  readLicenseV2DeviceFilters,
  readLicenseV2SecurityEventFilters,
  readLicenseV2SessionFilters,
} from '../src/lib/admin-license-v2-route-handlers'

test('License v2 后台设备筛选器会读取项目、状态、版本、关键字与分页', () => {
  const filters = readLicenseV2DeviceFilters(
    new Request(
      'http://127.0.0.1:3000/api/admin/license-v2/devices?projectKey=desktop-suite&status=ACTIVE&appVersion=1.2.3&keyword=machine&page=2&pageSize=25',
    ),
  )

  assert.deepEqual(filters, {
    projectKey: 'desktop-suite',
    status: 'ACTIVE',
    appVersion: '1.2.3',
    keyword: 'machine',
    page: 2,
    pageSize: 25,
  })
})

test('License v2 后台 session 筛选器会读取状态、关键字和分页', () => {
  const filters = readLicenseV2SessionFilters(
    new Request(
      'http://127.0.0.1:3000/api/admin/license-v2/sessions?status=REVOKED&keyword=ls_123&page=3&pageSize=10',
    ),
  )

  assert.deepEqual(filters, {
    projectKey: undefined,
    status: 'REVOKED',
    keyword: 'ls_123',
    page: 3,
    pageSize: 10,
  })
})

test('License v2 后台安全事件筛选器会读取事件、严重级别、时间范围与分页', () => {
  const filters = readLicenseV2SecurityEventFilters(
    new Request(
      'http://127.0.0.1:3000/api/admin/license-v2/security-events?projectKey=browser-plugin&eventType=PROOF_SIGNATURE_INVALID&severity=WARN&keyword=machine&createdFrom=2026-04-01T00:00:00.000Z&createdTo=2026-04-27T00:00:00.000Z&page=4&pageSize=50',
    ),
  )

  assert.deepEqual(filters, {
    projectKey: 'browser-plugin',
    eventType: 'PROOF_SIGNATURE_INVALID',
    severity: 'WARN',
    keyword: 'machine',
    createdFrom: '2026-04-01T00:00:00.000Z',
    createdTo: '2026-04-27T00:00:00.000Z',
    page: 4,
    pageSize: 50,
  })
})
