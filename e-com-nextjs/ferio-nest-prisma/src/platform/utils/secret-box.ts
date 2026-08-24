import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 12; // GCM standard

function resolveKey(secret: string | undefined): Buffer {
  if (!secret || secret.length < 32) {
    throw new Error(
      'PLATFORM_DB_CREDENTIAL_KEY must be set to at least 32 characters before tenant database credentials can be stored.',
    );
  }
  // Derive a stable 32-byte key from arbitrary-length secret material.
  return Buffer.from(secret.padEnd(KEY_LENGTH, '0'), 'utf8').subarray(0, KEY_LENGTH);
}

/**
 * AES-256-GCM envelope for tenant database credentials.
 * Output layout: base64(iv[12] || authTag[16] || ciphertext).
 */
export function encryptSecret(plaintext: string, secret: string | undefined): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', resolveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

export function decryptSecret(encoded: string, secret: string | undefined): string {
  const raw = Buffer.from(encoded, 'base64');
  if (raw.length <= IV_LENGTH + 16) {
    throw new Error('Encrypted credential payload is malformed');
  }
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = raw.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv('aes-256-gcm', resolveKey(secret), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
