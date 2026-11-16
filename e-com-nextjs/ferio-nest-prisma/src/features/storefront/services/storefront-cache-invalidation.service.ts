import { Injectable, Logger } from '@nestjs/common';
import { tryGetTenantContext } from '../../../tenancy/context/tenant-context';

@Injectable()
export class StorefrontCacheInvalidationService {
  private readonly logger = new Logger(StorefrontCacheInvalidationService.name);

  async invalidatePage(slug: string): Promise<void> {
    const customerWebUrl =
      process.env.CUSTOMER_WEB_INTERNAL_URL ||
      process.env.CUSTOMER_WEB_URL ||
      'http://localhost:3000';

    const secret =
      process.env.STOREFRONT_REVALIDATE_SECRET || 'ferio-internal-revalidate-secret';

    const tenantContext = tryGetTenantContext();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    };

    if (tenantContext?.hostname) {
      headers['x-forwarded-host'] = tenantContext.hostname;
    }

    try {
      const response = await fetch(`${customerWebUrl}/api/revalidate-storefront`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ slug }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Storefront cache revalidation for slug '${slug}' returned status ${response.status}`,
        );
      } else {
        this.logger.log(
          `Storefront cache revalidated for slug '${slug}' (tenant: ${tenantContext?.hostname || 'default'})`,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to reach customer web for cache revalidation: ${err.message}`,
      );
    }
  }
}

