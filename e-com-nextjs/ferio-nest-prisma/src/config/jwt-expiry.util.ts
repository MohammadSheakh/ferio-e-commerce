const JWT_EXPIRY_PATTERN = /^(\d+)([smhd])$/;
const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

export function jwtExpirySeconds(value: string, fallback: string): number {
  const match =
    JWT_EXPIRY_PATTERN.exec(value) ?? JWT_EXPIRY_PATTERN.exec(fallback);
  if (!match) throw new Error('JWT_EXPIRY_INVALID');
  const amount = Number(match[1]);
  const unit = UNIT_SECONDS[match[2]];
  if (!Number.isSafeInteger(amount) || amount <= 0 || !unit) {
    throw new Error('JWT_EXPIRY_INVALID');
  }
  return amount * unit;
}
