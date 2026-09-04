import {
  Injectable,
  UnauthorizedException,
  type OnModuleInit,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { StructuredLogger } from '@app/common';
import { PlatformPrismaService } from '../platform-prisma.service';

export interface PlatformPrincipal {
  platformUserId: string;
  email: string;
  roles: string[];
}

/**
 * Platform identity (MT-9 / ADR-0004 / ADR-0008).
 *
 * A completely separate credential realm from any tenant user. The initial
 * SUPERADMIN is seeded once from environment when the table is empty —
 * mirroring the tenant-admin seed convention — and never re-seeded after.
 */
@Injectable()
export class PlatformAuthService implements OnModuleInit {
  private readonly logger = new StructuredLogger(PlatformAuthService.name);

  constructor(private readonly platform: PlatformPrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureInitialSuperadmin();
  }

  async ensureInitialSuperadmin(): Promise<void> {
    const email =
      process.env.PLATFORM_INITIAL_SUPERADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.PLATFORM_INITIAL_SUPERADMIN_PASSWORD;
    const configuredPasswordHash =
      process.env.PLATFORM_INITIAL_SUPERADMIN_PASSWORD_HASH?.trim() ||
      undefined;
    if (!email || (!password && !configuredPasswordHash)) {
      return; // seeding optional in dev
    }

    const existing = await this.platform.client.platformUser.count();
    if (existing > 0) return;

    // Prefer a precomputed hash for deployments that already use one, while
    // allowing local development to provide only a plaintext secret.
    const passwordHash =
      configuredPasswordHash ??
      (password ? await bcrypt.hash(password, 12) : undefined);
    if (!passwordHash) return;

    await this.platform.client.platformUser.create({
      data: {
        email,
        passwordHash,
        displayName: 'Ferio Platform Owner',
        roles: { create: [{ role: 'SUPERADMIN' }] },
      },
    });
    this.logger.log('platform_superadmin_seeded', {});
  }

  async verifyCredentials(
    emailInput: string,
    password: string,
  ): Promise<PlatformPrincipal> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.platform.client.platformUser.findUnique({
      where: { email },
      include: { roles: true },
    });
    // Constant-shape failure regardless of user existence (enumeration-safe).
    const valid =
      !!user &&
      user.isActive &&
      (await bcrypt.compare(password, user.passwordHash).catch(() => false));
    if (!valid) {
      throw new UnauthorizedException('PLATFORM_CREDENTIALS_INVALID');
    }
    return {
      platformUserId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.role),
    };
  }

  /** Roster for the membership guard's support-access checks lives here too. */
  platformUserEmail(platformUserId: string): Promise<string | null> {
    return this.platform.client.platformUser
      .findUnique({
        where: { id: platformUserId },
        select: { email: true },
      })
      .then((user) => user?.email ?? null);
  }
}
