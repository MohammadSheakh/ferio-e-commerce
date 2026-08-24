import { bffErrorResponse, forwardedHeaders, proxyBackendResponse } from '@/lib/bff-response';
import { customerSessionFetch } from '@/lib/customer-session';

async function forward(request: Request, path: string[], method: string) {
  const suffix = path.length ? `/${path.join('/')}` : '';
  const query = new URL(request.url).search;
  const result = await customerSessionFetch(`/account/notifications${suffix}${query}`, {
    method,
    headers: forwardedHeaders(request),
  });
  if (!result) {
    return bffErrorResponse('Sign in to view notifications.', 401, 'AUTHENTICATION_REQUIRED');
  }
  return proxyBackendResponse(result.response, 'Unable to update notifications.');
}

export function GET(request: Request, context: { params: { path: string[] } }) {
  return forward(request, context.params.path, 'GET');
}

export function POST(request: Request, context: { params: { path: string[] } }) {
  return forward(request, context.params.path, 'POST');
}

export function PATCH(request: Request, context: { params: { path: string[] } }) {
  return forward(request, context.params.path, 'PATCH');
}

export function DELETE(request: Request, context: { params: { path: string[] } }) {
  return forward(request, context.params.path, 'DELETE');
}
