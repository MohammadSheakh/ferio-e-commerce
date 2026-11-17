import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const store = cookies();
  const slugFromParam = request.nextUrl.searchParams.get("slug")?.trim().toLowerCase();
  const slugFromCookie = store.get("ferio_store_slug")?.value?.trim().toLowerCase();
  const slug = slugFromParam || slugFromCookie || "test";

  const domain = process.env.PLATFORM_PUBLIC_DOMAIN || "sheakh.qzz.io";
  const tenantHost = `${slug}.${domain}`;

  const isPreview = request.nextUrl.searchParams.get("preview") !== "false";
  const customerWebUrl = process.env.CUSTOMER_WEB_INTERNAL_URL || "http://customer-web:3000";
  const targetUrl = `${customerWebUrl}/${isPreview ? "?preview=true" : ""}`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "x-forwarded-host": tenantHost,
        "x-forwarded-proto": "https",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });

    let html = await upstreamRes.text();

    // Base tag so all relative CSS, JS chunks, and images load correctly from the tenant domain
    const baseTag = `<base href="https://${tenantHost}/" />`;
    // Click interceptor to open external links in a new window rather than breaking the iframe studio
    const linkInterceptor = `
<script>
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (a && a.href && !a.href.startsWith('javascript:')) {
      a.target = '_blank';
    }
  }, true);
</script>`;

    const injection = `${baseTag}${linkInterceptor}`;

    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${injection}`);
    } else if (html.includes("<head ")) {
      html = html.replace(/<head[^>]*>/, `$&${injection}`);
    } else {
      html = `${injection}${html}`;
    }

    return new NextResponse(html, {
      status: upstreamRes.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Error connecting to storefront renderer";
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;padding:48px 24px;text-align:center;background:#fafafa;color:#111114;"><div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e8e8ea;border-radius:12px;padding:32px;"><h3 style="margin-top:0;font-size:16px;">Live Preview Connecting...</h3><p style="font-size:13px;color:#6e6e73;line-height:1.5;">${errorMsg}</p><p style="font-size:12px;color:#8e8e93;margin-top:16px;">Store: <strong>${tenantHost}</strong></p></div></body></html>`,
      {
        status: 502,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
}
