import { AsyncLocalStorage } from 'node:async_hooks';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
export type CourierCredentials = Readonly<Record<string, string>>;

const runtimeCredentials = new AsyncLocalStorage<CourierCredentials>();

function key(secret: string | undefined): Buffer {
  if (!secret || secret.length < KEY_LENGTH) {
    throw new Error(
      'PLATFORM_DB_CREDENTIAL_KEY must be set to at least 32 characters before courier credentials can be stored.',
    );
  }
  return Buffer.from(secret.padEnd(KEY_LENGTH, '0'), 'utf8').subarray(
    0,
    KEY_LENGTH,
  );
}

export function encryptCourierCredentials(
  credentials: CourierCredentials,
  secret: string | undefined,
): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credentials), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    'base64',
  );
}

export function decryptCourierCredentials(
  encoded: string,
  secret: string | undefined,
): CourierCredentials {
  const raw = Buffer.from(encoded, 'base64');
  if (raw.length <= IV_LENGTH + TAG_LENGTH)
    throw new Error('Encrypted courier credential payload is malformed');
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
  if (!isCredentials(decoded))
    throw new Error('Courier credentials are invalid');
  return decoded;
}

export function runWithCourierCredentials<T>(
  credentials: CourierCredentials | undefined,
  callback: () => T,
): T {
  return credentials
    ? runtimeCredentials.run(credentials, callback)
    : callback();
}

export function tenantAwareCourierConfig(config: ConfigService): ConfigService {
  return new Proxy(config, {
    get(target, property, receiver) {
      if (property === 'get') {
        return (name: string, fallback?: unknown) => {
          const value = runtimeCredentials.getStore()?.[name];
          return value ?? target.get<unknown>(name, fallback);
        };
      }
      if (property === 'getOrThrow') {
        return (name: string) => {
          const value = runtimeCredentials.getStore()?.[name];
          return value ?? target.getOrThrow<unknown>(name);
        };
      }
      return Reflect.get(target, property, receiver) as unknown;
    },
  });
}

function isCredentials(value: unknown): value is CourierCredentials {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}
