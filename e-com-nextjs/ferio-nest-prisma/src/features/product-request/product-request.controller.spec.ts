import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY, PERMISSIONS, ROLES_KEY } from '@app/common';
import { TenantMembershipGuard } from '../../tenancy/tenant-membership.guard';
import {
  AdminProductRequestController,
  PublicProductRequestController,
} from './product-request.controller';

describe('ProductRequestController authorization', () => {
  it('keeps public submission separate from administrative operations', () => {
    expect(PublicProductRequestController).not.toBe(AdminProductRequestController);
    expect(Reflect.getMetadata(ROLES_KEY, PublicProductRequestController)).toBeUndefined();
  });

  it('requires admin role, read permission, and tenant membership', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminProductRequestController)).toEqual([
      'admin',
    ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, AdminProductRequestController),
    ).toEqual([PERMISSIONS.PRODUCT_REQUESTS_READ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminProductRequestController)).toContain(
      TenantMembershipGuard,
    );
  });

  it('requires manage permission for mutations', () => {
    for (const method of ['updateStatus', 'deleteRequest'] as const) {
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          AdminProductRequestController.prototype[method],
        ),
      ).toEqual([PERMISSIONS.PRODUCT_REQUESTS_MANAGE]);
    }
  });
});
