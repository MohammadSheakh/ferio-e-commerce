import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Callback tenant binding (MT-7 §10.6).
 *
 * Payment gateways echo our own callback URLs back to us, so the ONLY safe
 * way to route an asynchronous callback to its tenant database is to embed a
 * tamper-proof tenant marker in that URL at initiation time. The marker is
 * `orgId.<HMAC_SHA256(orgId, PLATFORM_CALLBACK_SECRET)>`; forgery requires
 * the server-side secret, so browser-supplied values are untrusted input
 * that fails verification.
 */
export function buildCallbackToken(organizationId: string, secret: string | undefined): string {
  if (!secret || secret.length < 24) {
    throw new Error(
      'PLATFORM_CALLBACK_SECRET must be set (>= 24 chars) before tenant payment callbacks can be minted.',
    );
  }
  const signature = createHmac('sha256', secret).update(organizationId).digest('base64url');
  return `${organizationId}.${signature}`;
}

export function verifyCallbackToken(
  token: string | undefined,
  secret: string | undefined,
): string | null {
  if (!token || !secret) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const organizationId = token.slice(0, dot);
  const provided = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(
    createHmac('sha256', secret).update(organizationId).digest('base64url'),
  );
  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? organizationId : null;
}
