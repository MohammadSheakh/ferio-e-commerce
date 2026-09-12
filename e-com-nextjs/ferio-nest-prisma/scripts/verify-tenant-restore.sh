#!/usr/bin/env bash
# MT-12 restore verification helper. Read-only: never changes the target DB.
# Usage: ./scripts/verify-tenant-restore.sh <restore_drill_database>
set -euo pipefail
umask 077

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <restore_drill_database>" >&2
  exit 64
fi

DB="$1"
if [[ ! "$DB" =~ ^restore_drill_[A-Za-z0-9_]+$ ]]; then
  echo "database must use the isolated restore_drill_<name> format" >&2
  exit 64
fi

PSQL=(psql --dbname="$DB" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1)

for table in \
  _prisma_migrations \
  ProductMedia \
  Attachment \
  Order \
  OrderItem \
  PaymentTransaction \
  CommerceRefund \
  RefundAttempt \
  Wallet \
  WalletTransactionHistory \
  ReconciliationRun \
  ReconciliationFinding; do
  exists="$("${PSQL[@]}" --command="SELECT to_regclass(format('%I', '$table')) IS NOT NULL")"
  if [[ "$exists" != "t" ]]; then
    echo "restore verification failed: missing table $table" >&2
    exit 74
  fi
done

assert_zero() {
  local label="$1"
  local query="$2"
  local count
  count="$("${PSQL[@]}" --command="$query" | xargs)"
  if [[ "$count" != "0" ]]; then
    echo "restore verification failed: $label=$count" >&2
    exit 74
  fi
  echo "$label=0"
}

assert_zero "empty_product_media_urls" \
  "SELECT count(*) FROM \"ProductMedia\" WHERE btrim(\"url\") = ''"
assert_zero "empty_attachment_references" \
  "SELECT count(*) FROM \"Attachment\" WHERE btrim(\"attachment\") = ''"
assert_zero "orphan_order_items" \
  'SELECT count(*) FROM "OrderItem" item LEFT JOIN "Order" ord ON ord."id" = item."orderId" WHERE ord."id" IS NULL'
assert_zero "orphan_payment_users" \
  'SELECT count(*) FROM "PaymentTransaction" payment LEFT JOIN "User" usr ON usr."id" = payment."userId" WHERE usr."id" IS NULL'
assert_zero "negative_payment_amounts" \
  'SELECT count(*) FROM "PaymentTransaction" WHERE "amount" < 0'
assert_zero "orphan_refund_attempts" \
  'SELECT count(*) FROM "RefundAttempt" attempt LEFT JOIN "CommerceRefund" refund ON refund."id" = attempt."refundId" WHERE refund."id" IS NULL'
assert_zero "negative_refund_amounts" \
  'SELECT count(*) FROM "CommerceRefund" WHERE "amount" < 0'
assert_zero "orphan_wallet_transactions" \
  'SELECT count(*) FROM "WalletTransactionHistory" txn LEFT JOIN "Wallet" wallet ON wallet."id" = txn."walletId" WHERE wallet."id" IS NULL'
assert_zero "invalid_completed_wallet_balances" \
  "SELECT count(*) FROM \"WalletTransactionHistory\" WHERE \"status\" = 'completed' AND ((\"type\" = 'credit' AND \"balanceAfter\" <> \"balanceBefore\" + \"amount\") OR (\"type\" IN ('debit', 'withdrawal') AND \"balanceAfter\" <> \"balanceBefore\" - \"amount\"))"
assert_zero "invalid_reconciliation_counters" \
  'SELECT count(*) FROM "ReconciliationRun" WHERE "detectedCount" < 0 OR "openedCount" < 0 OR "autoResolvedCount" < 0 OR "openedCount" > "detectedCount" OR "autoResolvedCount" > "detectedCount"'

schema_version="$("${PSQL[@]}" --command='SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1' | xargs)"
if [[ ! "$schema_version" =~ ^[0-9]{14}_[A-Za-z0-9_-]+$ ]]; then
  echo "restore verification failed: no completed Prisma migration found" >&2
  exit 74
fi

reconciliation_runs="$("${PSQL[@]}" --command='SELECT count(*) FROM "ReconciliationRun"' | xargs)"
echo "schema_version=$schema_version"
echo "reconciliation_runs=$reconciliation_runs"
echo "restore verification passed: structural media, financial-ledger, and reconciliation checks are clean"
echo "provider_check_required: verify external object/media existence against the approved storage provider"
