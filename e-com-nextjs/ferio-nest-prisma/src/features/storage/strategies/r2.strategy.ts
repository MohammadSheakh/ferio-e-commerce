import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl as s3Presign } from '@aws-sdk/s3-request-presigner';
export interface StorageUploadResult {
  url: string;
  publicId?: string;
  size?: number;
  mimeType?: string;
}

export interface StorageStrategy {
  getStrategyName(): string;
  uploadFile(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    folder: string,
  ): Promise<StorageUploadResult>;
  deleteFile(publicIdOrUrl: string): Promise<void>;
  getSignedUrl(key: string): Promise<string>;
  presignPut(
    folder: string,
    filename: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<{ key: string; url: string }>;
  inspectUploadedObject(
    key: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<{ key: string; contentType: string; sizeBytes: number }>;
  listTenantObjectKeys(): Promise<readonly string[]>;
  deleteTenantObjects(): Promise<{ deleted: number }>;
}

// Legacy strategy contract kept for reference (attachments module is
// intentionally build-excluded dead code pending Postgres rewrite).
export interface IFileUploadStrategy {
  uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<FileUploadResult>;
  deleteFile(publicIdOrUrl: string): Promise<void>;
  getStrategyName(): string;
}
interface FileUploadResult {
  url: string;
  publicId?: string;
}

import {
  assertTenantObjectKey,
  tenantObjectKey,
} from '../../../tenancy/utils/object-keys.util';
import { tryGetTenantContext } from '../../../tenancy/context/tenant-context';

export function sanitizeStoragePath(value: string, fallback = 'misc'): string {
  const segments = value
    .normalize('NFKC')
    .split(/[\\/]+/)
    .map((segment) => sanitizeStorageSegment(segment))
    .filter((segment) => segment.length > 0 && segment !== '.');
  return segments.join('/') || fallback;
}

function sanitizeStorageSegment(value: string): string {
  return value
    .replace(/\.+/g, '.')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/**
 * Cloudflare R2 storage strategy (PO-017 / owner decision #6).
 *
 * R2 is S3-compatible: same client, custom endpoint, no ACL flag (R2
 * buckets are private by default — access is granted exclusively through
 * short-lived presigned URLs).
 *
 * Isolation rules (§11.4):
 * - Every object key is tenant-namespaced via tenantObjectKey()
 *   (`tenants/{organizationId}/…`; legacy mode is explicit) — the
 *   organization comes from ambient server-side context and can never be
 *   supplied by a client. Tenant mode fails closed without that context.
 * - Private evidence stays private: nothing is ever public-read.
 */
@Injectable()
export class R2Strategy implements StorageStrategy {
  private readonly logger = new Logger(R2Strategy.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly presignExpiresSeconds: number;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    this.bucket = process.env.R2_BUCKET ?? '';
    this.presignExpiresSeconds = Number(
      process.env.R2_PRESIGN_EXPIRES_SECONDS ?? 3600,
    );

    if (!accountId || !this.bucket || !process.env.R2_ACCESS_KEY_ID) {
      this.logger.warn(
        'R2 storage strategy constructed without full configuration — uploads will fail until R2_ACCOUNT_ID/R2_BUCKET/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY are set.',
      );
    }

    // R2_ENDPOINT override enables S3-compatible dev targets (MinIO) with
    // the exact code path production uses against real R2.
    const endpoint =
      process.env.R2_ENDPOINT ??
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      // Path-style is required by S3-compatible targets (MinIO) and is what
      // the presigner must match; real R2 accepts both.
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  getStrategyName(): string {
    return 'r2';
  }

  private tenantPrefix(): string {
    if (!tryGetTenantContext()) {
      throw new ServiceUnavailableException(
        'TENANT_IDENTITY_CONTEXT_REQUIRED_FOR_OBJECT_STORAGE',
      );
    }
    return `${tenantObjectKey()}/`;
  }

  /** Tenant-scoped object key; folder/legacy handling mirrors PO-017. */
  private keyFor(publicIdOrKeyOrFolder: string, filename?: string): string {
    void filename;
    // A stored publicId IS the full key for R2.
    return publicIdOrKeyOrFolder;
  }

  async uploadFile(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    folder: string,
  ): Promise<StorageUploadResult> {
    const key = tenantObjectKey(
      folder,
      `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`,
    );

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // No ACL: R2 buckets are private; delivery is via presigned GET.
      }),
    );

    const url = await this.getSignedUrl(key);
    return { url, publicId: key, size: file.size, mimeType: file.mimetype };
  }

  async deleteFile(publicIdOrUrl: string): Promise<void> {
    // Accept either a bare key or a URL containing one.
    const key = publicIdOrUrl.includes('/')
      ? publicIdOrUrl.replace(/^.*?tenants\//, 'tenants/').split('?')[0]
      : publicIdOrUrl;
    assertTenantObjectKey(key);

    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async listTenantObjectKeys(): Promise<readonly string[]> {
    const prefix = this.tenantPrefix();
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const page = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const object of page.Contents ?? []) {
        if (object.Key?.startsWith(prefix)) keys.push(object.Key);
      }
      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return keys;
  }

  async deleteTenantObjects(): Promise<{ deleted: number }> {
    const keys = await this.listTenantObjectKeys();
    let deleted = 0;
    for (let index = 0; index < keys.length; index += 1000) {
      const batch = keys.slice(index, index + 1000).map((Key) => ({ Key }));
      await this.s3Client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch, Quiet: true },
        }),
      );
      deleted += batch.length;
    }
    return { deleted };
  }

  /**
   * Presigned direct-to-bucket PUT. The key is built server-side inside the
   * caller's tenant namespace and returned so the client can neither rename
   * paths nor escape its own prefix.
   */
  async presignPut(
    folder: string,
    filename: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<{ key: string; url: string }> {
    const safeFolder = sanitizeStoragePath(folder);
    const safeName =
      sanitizeStorageSegment(filename.replace(/[\\/]+/g, '-')) || 'upload.bin';
    const key = tenantObjectKey(safeFolder, `${Date.now()}-${safeName}`);
    const url = await s3Presign(
      this.s3Client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: sizeBytes,
      }),
      { expiresIn: this.presignExpiresSeconds },
    );
    return { key, url };
  }

  /**
   * Verify the object that arrived through a direct PUT before it is used by
   * the application. Presigning validates client intent; this validates the
   * stored object's metadata and magic bytes under the tenant namespace.
   */
  async inspectUploadedObject(
    key: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<{ key: string; contentType: string; sizeBytes: number }> {
    assertTenantObjectKey(key);
    const head = await this.s3Client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const actualContentType = head.ContentType;
    const actualSize = head.ContentLength;
    if (
      actualContentType !== contentType ||
      actualSize !== sizeBytes ||
      actualSize === undefined
    ) {
      throw new BadRequestException('STORAGE_OBJECT_METADATA_MISMATCH');
    }

    const object = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Range: 'bytes=0-15',
      }),
    );
    if (!object.Body) {
      throw new ServiceUnavailableException('STORAGE_OBJECT_BODY_MISSING');
    }
    const prefix = Buffer.from(await object.Body.transformToByteArray());
    const signatureMatches =
      (contentType === 'image/jpeg' &&
        prefix.length >= 3 &&
        prefix.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
      (contentType === 'image/png' &&
        prefix.length >= 8 &&
        prefix
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          )) ||
      (contentType === 'image/webp' &&
        prefix.length >= 12 &&
        prefix.subarray(0, 4).toString('ascii') === 'RIFF' &&
        prefix.subarray(8, 12).toString('ascii') === 'WEBP') ||
      (contentType === 'application/pdf' &&
        prefix.subarray(0, 5).toString('ascii') === '%PDF-');
    if (!signatureMatches) {
      throw new BadRequestException('STORAGE_OBJECT_CONTENT_MISMATCH');
    }
    return { key, contentType, sizeBytes: actualSize };
  }

  /**
   * Short-lived signed GET for private objects. Expiry configurable via
   * R2_PRESIGN_EXPIRES_SECONDS (default 1h).
   */
  async getSignedUrl(key: string): Promise<string> {
    assertTenantObjectKey(key);
    return s3Presign(
      this.s3Client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: this.presignExpiresSeconds },
    );
  }
}
