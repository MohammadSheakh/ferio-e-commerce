import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PlatformPrismaService } from '../platform/platform-prisma.service';

@Injectable()
export class TenantReturnOriginService {
  constructor(private readonly platform: PlatformPrismaService) {}

  async forOrganization(organizationId: string): Promise<string> {
    const domain = await this.platform.client.tenantDomain.findFirst({
      where: { organizationId, status: 'ACTIVE' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: { hostname: true },
    });
    if (!domain) {
      throw new ServiceUnavailableException('TENANT_RETURN_DOMAIN_UNAVAILABLE');
    }

    const origin = new URL(`https://${domain.hostname}`);
    if (
      origin.hostname !== domain.hostname ||
      origin.username ||
      origin.password ||
      origin.port
    ) {
      throw new ServiceUnavailableException('TENANT_RETURN_DOMAIN_INVALID');
    }
    return origin.origin;
  }
}
