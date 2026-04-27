import { generateLicenseV2OfflineKeyPair } from '../src/lib/license-v2-offline-keypair'

const keyPair = generateLicenseV2OfflineKeyPair()

console.log('# Add the private key to the server environment. Keep it secret.')
console.log(`LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64=${keyPair.privateKeyBase64}`)
console.log('')
console.log('# Embed or pin this public key in production clients.')
console.log(`LICENSE_V2_OFFLINE_PUBLIC_KEY=${keyPair.publicKey}`)
