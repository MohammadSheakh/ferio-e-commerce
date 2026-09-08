import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export type PaymentCredentialValue = string;
export type PaymentCredentials = Readonly<Record<string, PaymentCredentialValue>>;

function key(secret: string | undefined): Buffer {
  if (!secret || secret.length < KEY_LENGTH) {
    throw new Error(
      'PLATFORM_DB_CREDENTIAL_KEY must be set to at least 32 characters before payment credentials can be stored.',
    );
  }
  return Buffer.from(secret.padEnd(KEY_LENGTH, '0'), 'utf8').subarray(0, KEY_LENGTH);
}

export function encryptPaymentCredentials(
  credentials: PaymentCredentials,
  secret: string | undefined,
): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credentials), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

export function decryptPaymentCredentials(
  encoded: string,
  secret: string | undefined,
): PaymentCredentials {
  const raw = Buffer.from(encoded, 'base64');
  if (raw.length <= IV_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted payment credential payload is malformed');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(secret),
    raw.subarray(0, IV_LENGTH),
  );
  decipher.setAuthTag(raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH));
  const decoded = JSON.parse(
    Buffer.concat([
      decipher.update(raw.subarray(IV_LENGTH + TAG_LENGTH)),
      decipher.final(),
    ]).toString('utf8'),
  ) as unknown;
  if (!isCredentials(decoded)) throw new Error('Payment credentials are invalid');
  return decoded;
}

function isCredentials(value: unknown): value is PaymentCredentials {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}
