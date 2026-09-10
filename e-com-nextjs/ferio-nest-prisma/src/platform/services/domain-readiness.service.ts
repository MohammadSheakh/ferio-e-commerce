import { Injectable } from '@nestjs/common';
import dns from 'node:dns/promises';
import tls from 'node:tls';

const READINESS_TIMEOUT_MS = 5_000;

export class DomainReadinessError extends Error {
  constructor(public readonly check: 'DNS' | 'TLS') {
    super(`DOMAIN_${check}_NOT_READY`);
    this.name = 'DomainReadinessError';
  }
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('DOMAIN_READINESS_TIMEOUT')),
      READINESS_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function flattenTxt(records: string[][]): string[] {
  return records.map((record) => record.join('')).filter(Boolean);
}

@Injectable()
export class DomainReadinessService {
  async verify(hostname: string, verificationToken: string): Promise<void> {
    try {
      const records = await withTimeout(
        dns.resolveTxt(`_ferio-verification.${hostname}`),
      );
      if (!flattenTxt(records).includes(verificationToken)) {
        throw new Error('DOMAIN_VERIFICATION_TOKEN_MISSING');
      }
    } catch {
      throw new DomainReadinessError('DNS');
    }

    try {
      await withTimeout(this.verifyTls(hostname));
    } catch {
      throw new DomainReadinessError('TLS');
    }
  }

  private verifyTls(hostname: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: true,
        timeout: READINESS_TIMEOUT_MS,
      });

      const finish = (error?: Error) => {
        socket.destroy();
        if (error) reject(error);
        else resolve();
      };

      socket.once('secureConnect', () => {
        if (!socket.authorized) {
          finish(
            new Error(
              typeof socket.authorizationError === 'string'
                ? socket.authorizationError
                : 'TLS_CERTIFICATE_INVALID',
            ),
          );
          return;
        }
        finish();
      });
      socket.once('timeout', () => finish(new Error('TLS_CONNECTION_TIMEOUT')));
      socket.once('error', finish);
    });
  }
}
