import type { WarrantyClaimStatus } from '@prisma/client';
const transitions: Record<WarrantyClaimStatus, WarrantyClaimStatus[]> = {
  SUBMITTED: ['PRODUCT_RECEIVED', 'REJECTED'],
  PRODUCT_RECEIVED: ['UNDER_DIAGNOSIS', 'SENT_TO_BRAND', 'REJECTED'],
  UNDER_DIAGNOSIS: ['REPAIRED', 'SENT_TO_BRAND', 'REJECTED'],
  SENT_TO_BRAND: ['RECEIVED_FROM_BRAND', 'REJECTED'],
  RECEIVED_FROM_BRAND: ['REPAIRED', 'RESOLVED', 'REJECTED'],
  REPAIRED: ['RESOLVED'],
  RESOLVED: [],
  REJECTED: [],
};
export function canTransitionWarranty(
  from: WarrantyClaimStatus,
  to: WarrantyClaimStatus,
) {
  return transitions[from].includes(to);
}
