import { proxyBackendResponse, forwardedHeaders } from '@/lib/bff-response';

const backendApiUrl =
  process.env.NEXT_PUBLIC_FERIO_API_URL ?? 'http://localhost:6733/api/v1';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${backendApiUrl}/storefront-analytics/events`, {
      method: 'POST',
      headers: forwardedHeaders(request, {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    return proxyBackendResponse(response, 'Analytics event could not be accepted.');
  } catch {
    return new Response(null, { status: 204 });
  }
}
