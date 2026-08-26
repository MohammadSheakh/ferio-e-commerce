// Storage smoke: R2 strategy against MinIO (S3-compatible) — proves the
// bucket wiring, tenant-prefixed keys and presigned GET end to end.
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { tryGetTenantContext } from '../dist/src/tenancy/tenant-context.js';
import { tenantObjectKey } from '../dist/src/tenancy/object-keys.util.js';
import { R2Strategy } from '../dist/src/features/storage/r2.strategy.js';

process.env.R2_ACCOUNT_ID = '';
process.env.R2_ENDPOINT = 'http://localhost:9000';
process.env.R2_BUCKET = 'ferio-media';
process.env.R2_ACCESS_KEY_ID = 'minioadmin';
process.env.R2_SECRET_ACCESS_KEY = 'minioadmin';

// Seed a marker object directly so presigned GET has something to fetch.
const seed = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' },
});
await seed.send(new PutObjectCommand({
  Bucket: 'ferio-media',
  Key: 'tenants/org-smoke/probe.txt',
  Body: 'ferio-storage-ok',
}));

// Tenant context drives the key namespace inside the strategy.
const ctx = Object.freeze({ organizationId: 'org-smoke' });
const { runWithTenantContext } = await import('../dist/src/tenancy/tenant-context.js');
const key = runWithTenantContext(ctx, () => tenantObjectKey('products', 'probe-upload.png'));
console.log('TENANT_KEY', key);
if (key !== 'tenants/org-smoke/products/probe-upload.png') throw new Error('bad namespace');

const strategy = new R2Strategy();
const url = await strategy.getSignedUrl('tenants/org-smoke/probe.txt');
const res = await fetch(url);
const body = await res.text();
if (!res.ok || body !== 'ferio-storage-ok') throw new Error(`presigned GET failed: ${res.status}`);
console.log('PRESIGNED_GET_OK', res.status);

// Upload path through the strategy interface itself.
const fake = { buffer: Buffer.from('png-bytes'), originalname: 'probe upload.png', mimetype: 'image/png', size: 9 };
const up = await runWithTenantContext(ctx, () => new R2Strategy().uploadFile(fake, 'products'));
if (!up.publicId.startsWith('tenants/org-smoke/products/')) throw new Error('upload key not tenant-scoped');
const check = await fetch(up.url);
if (!(await check.text()).includes('png-bytes')) throw new Error('uploaded object unreadable via presigned URL');
console.log('UPLOAD_PRESIGN_ROUNDTRIP_OK', up.publicId);

await strategy.deleteFile(up.publicId);
console.log('STORAGE_SMOKE_OK');
process.exit(0);
