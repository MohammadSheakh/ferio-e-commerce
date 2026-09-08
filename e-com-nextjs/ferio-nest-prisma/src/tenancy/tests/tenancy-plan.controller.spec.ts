import type { Request } from 'express';
import { TenancyPlanController } from '../controllers/tenancy-plan.controller';
import { runWithTenantContext } from '../context/tenant-context';

describe('TenancyPlanController overdue subscription behavior', () => {
  it('keeps Tenant Admin plan and recovery metadata visible while past due', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const controller = new TenancyPlanController(
      { findActive: jest.fn().mockResolvedValue({ role: 'OWNER' }) } as never,
      {
        client: {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              status: 'PAST_DUE',
              currentPeriodEnd: new Date('2026-09-15T00:00:00.000Z'),
              plan: {
                key: 'business',
                displayName: 'Business',
                entitlements: [
                  { featureKey: 'staff_seats', enabled: true, limit: 10 },
                  { featureKey: 'custom_domain', enabled: false, limit: null },
                ],
              },
            }),
          },
          tenantDomain: {
            findMany: jest.fn().mockResolvedValue([
              {
                hostname: 'overdue.example.com',
                status: 'ACTIVE',
                isPrimary: true,
              },
            ]),
          },
        },
      } as never,
      {} as never,
      {
        snapshot: jest.fn().mockResolvedValue({ orders_per_month: '12' }),
      } as never,
    );

    const request = {
      user: { email: 'owner@example.com' },
    } as unknown as Request;

    await expect(
      runWithTenantContext(
        {
          correlationId: 'corr-overdue',
          organizationId: 'org-overdue',
          tenantDatabaseId: 'tdb-overdue',
          database: {
            id: 'tdb-overdue',
            host: 'h',
            port: 5432,
            databaseName: 'd',
            username: 'u',
            credentialCipher: 'c',
          },
          domainId: 'dom-overdue',
          hostname: 'overdue.example.com',
          subscriptionStatus: 'PAST_DUE',
        },
        () => controller.myPlan(request),
      ),
    ).resolves.toMatchObject({
      code: 'ACTIVE',
      plan: { key: 'business', displayName: 'Business' },
      subscription: {
        status: 'PAST_DUE',
        currentPeriodEnd: '2026-09-15T00:00:00.000Z',
      },
      usage: { orders_per_month: '12' },
      limits: { staff_seats: 10 },
      features: { staff_seats: true, custom_domain: false },
    });
  });
});
