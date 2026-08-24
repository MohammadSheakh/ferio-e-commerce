import { bffErrorResponse, forwardedHeaders, proxyBackendResponse } from '@/lib/bff-response';
import { customerSessionFetch } from '@/lib/customer-session';

export async function POST(request: Request) {
  const body = await request.text();
  const result = await customerSessionFetch('/account/wallet/top-ups', {
    method: 'POST',
    headers: forwardedHeaders(request, {
      'Content-Type': 'application/json',
      ...(request.headers.get('idempotency-key')
        ? { 'Idempotency-Key': request.headers.get('idempotency-key')! }
        : {}),
    }),
    body,
  });
  if (!result) {
    return bffErrorResponse('Sign in to recharge your wallet.', 401, 'AUTHENTICATION_REQUIRED');
  }
  return proxyBackendResponse(result.response, 'Unable to submit the top-up.');
}
