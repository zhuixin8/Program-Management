import crypto from 'crypto'

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
const privateKeyDer = privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer
const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
const rawPublicKey = publicKeyDer.subarray(-32).toString('base64url')

console.log('# Add the private key to the server environment. Keep it secret.')
console.log(`LICENSE_V2_OFFLINE_PRIVATE_KEY_BASE64=${privateKeyDer.toString('base64')}`)
console.log('')
console.log('# Embed or pin this public key in production clients.')
console.log(`LICENSE_V2_OFFLINE_PUBLIC_KEY=${rawPublicKey}`)
