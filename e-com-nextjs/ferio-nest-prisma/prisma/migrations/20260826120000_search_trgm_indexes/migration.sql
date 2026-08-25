-- §16.3 / FR-SRCH: product search compiles to ILIKE '%term%', which no
-- B-tree can serve. pg_trgm GIN indexes make leading-wildcard searches
-- index-driven, deferring dedicated search infrastructure (FR-SRCH-007).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ProductVariant_sku_trgm_idx"
  ON "ProductVariant" USING gin ("sku" gin_trgm_ops);
