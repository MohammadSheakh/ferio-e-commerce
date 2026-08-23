export function maskPurchaseCustomerName(name: string) {
  const firstCharacter = Array.from(name.normalize('NFKC').trim())[0];
  return firstCharacter ? `${firstCharacter}***` : 'A customer';
}
