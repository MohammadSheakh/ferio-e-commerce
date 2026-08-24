import { bffErrorResponse, proxyBackendResponse } from '@/lib/bff-response';
import { customerSessionFetch } from '@/lib/customer-session';

export async function GET(request: Request) {
  const query = new URL(request.url).search;
  const result = await customerSessionFetch(`/account/notifications${query}`);
  if (!result) {
    return bffErrorResponse('Sign in to view notifications.', 401, 'AUTHENTICATION_REQUIRED');
  }
  return proxyBackendResponse(result.response, 'Unable to load notifications.');
}
