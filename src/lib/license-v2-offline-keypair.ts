import crypto from 'crypto'

export type LicenseV2OfflineKeyPair = {
  privateKeyBase64: string
  publicKey: string
}

export function generateLicenseV2OfflineKeyPair(): LicenseV2OfflineKeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const privateKeyBase64 = privateKey
    .export({ format: 'der', type: 'pkcs8' })
    .toString('base64')
  const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' }) as Buffer

  return {
    privateKeyBase64,
    publicKey: publicKeyDer.subarray(-32).toString('base64url'),
  }
}
