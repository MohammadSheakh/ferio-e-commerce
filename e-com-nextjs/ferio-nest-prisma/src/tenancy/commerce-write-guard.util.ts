import { ForbiddenException } from '@nestjs/common';
import { tryGetTenantContext } from './tenant-context';

/**
 * PO-005-R: when a subscription is SUSPENDED the storefront stays browsable
 * and Tenant Admin stays reachable for viewing/exporting/billing, but
 * commerce MUTATIONS are disabled (product edits, inventory changes, cart
 * changes, new orders, campaigns).
 *
 * Call at the top of every commerce mutation entry point. Outside a tenant
 * context (legacy deployments) this is a no-op.
 */
export function assertTenantCommerceWritable(): void {
  const context = tryGetTenantContext();
  if (context && context.subscriptionStatus === 'SUSPENDED') {
    throw new ForbiddenException('COMMERCE_MUTATION_DISABLED_SUSPENDED');
  }
}
