import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getTenantStatus } from "@/lib/tenancy";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenant = await getTenantStatus();
  const disallowAll = tenant.code !== "ACTIVE" && tenant.code !== "LEGACY";
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const origin = host
    ? `${protocol}://${host}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002");

  return {
    rules: {
      userAgent: "*",
      disallow: disallowAll ? "/" : ["/api/", "/account/"],
    },
    ...(disallowAll ? {} : { sitemap: `${origin}/sitemap.xml` }),
  };
}
