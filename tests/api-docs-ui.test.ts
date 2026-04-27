import assert from 'node:assert/strict'
import test from 'node:test'

import { buildApiDocsPageModel } from '../src/lib/api-docs-ui'

test('buildApiDocsPageModel 会返回正式接口、兼容接口与多语言示例', () => {
  const model = buildApiDocsPageModel()

  assert.equal(model.summaryCards.length, 3)
  assert.equal(model.endpoints.filter((endpoint) => endpoint.audience === 'recommended').length, 5)
  assert.equal(model.endpointGroups.length, 2)
  assert.equal(model.endpointGroups[0]?.key, 'license-v2')
  assert.equal(model.endpointGroups[0]?.endpoints.length, 5)
  assert.equal(model.endpointGroups[1]?.key, 'license-v1')
  assert.equal(model.endpointGroups[1]?.endpoints.length, 4)
  assert.equal(model.endpoints.some((endpoint) => endpoint.path === '/api/license/v2/enroll'), true)
  assert.equal(model.endpoints.some((endpoint) => endpoint.path === '/api/license/v2/consume'), true)
  assert.equal(model.endpoints.some((endpoint) => endpoint.path === '/api/verify'), true)
  assert.deepEqual(
    model.languageSnippets.map((snippet) => snippet.key),
    ['python', 'curl', 'sdk'],
  )
})

test('buildApiDocsPageModel 会强调 Python 桌面接入、设备绑定与 consume 幂等', () => {
  const model = buildApiDocsPageModel()
  const consumeEndpoint = model.endpoints.find((endpoint) => endpoint.key === 'v2-consume')
  const pythonSnippet = model.languageSnippets.find((snippet) => snippet.key === 'python')

  assert.ok(consumeEndpoint)
  assert.equal(
    consumeEndpoint?.highlights.some((item) => item.includes('requestId')),
    true,
  )
  assert.equal(
    model.researchSteps.some((step) => step.title.includes('machineId')),
    true,
  )
  assert.equal(
    model.researchSteps.some((step) => step.description.includes('Ed25519')),
    true,
  )
  assert.equal(
    model.integrationFlowSteps.some((step) => step.endpoint.includes('/api/license/v2/enroll')),
    true,
  )
  assert.equal(
    model.integrationFlowSteps.some((step) => step.successResult.includes('licenseToken')),
    true,
  )
  assert.equal(
    model.integrationFlowSteps.some((step) => step.endpoint.includes('offlineLicense')),
    true,
  )
  assert.equal(
    model.responseFields.some((field) => field.field.includes('offlineLicense')),
    true,
  )
  assert.equal(
    model.requestFields.some((field) => field.field.includes('fingerprintHash')),
    true,
  )
  assert.equal(
    model.integrationFlowSteps.some((step) => step.serverAction.includes('指纹漂移')),
    true,
  )
  assert.equal(
    model.licenseModels.some((modelCard) => modelCard.badge === 'DEVICE'),
    true,
  )
  assert.equal(
    pythonSnippet?.code.includes('license_v2_client.py'),
    true,
  )
  assert.equal(
    model.adminGroups.some((group) => group.title.includes('License v2')),
    true,
  )
})
