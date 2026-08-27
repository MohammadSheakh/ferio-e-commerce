import { BadRequestException } from '@nestjs/common';

export function normalizeBangladeshPhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, '');
  const local = compact.startsWith('+880')
    ? `0${compact.slice(4)}`
    : compact.startsWith('880')
      ? `0${compact.slice(3)}`
      : compact;

  if (!/^01[3-9]\d{8}$/.test(local)) {
    throw new BadRequestException('Enter a valid Bangladesh mobile number');
  }
  return `+88${local}`;
}

export function normalizeDistrict(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function calculateDeliveryFee(
  subtotal: number,
  deliveryFee: number,
  freeDeliveryThreshold: number | null,
): number {
  return freeDeliveryThreshold !== null && subtotal >= freeDeliveryThreshold
    ? 0
    : deliveryFee;
}
