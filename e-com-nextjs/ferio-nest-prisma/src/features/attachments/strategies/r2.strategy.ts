import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as s3Presign } from '@aws-sdk/s3-request-presigner';
import {
  IFileUploadStrategy,
  FileUploadResult,
} from './file-upload.strategy.interface';
import { tenantObjectKey } from '../../../tenancy/object-keys.util';

/**
 * Cloudflare R2 storage strategy (PO-017 / owner decision #6).
 *
 * R2 is S3-compatible: same client, custom endpoint, no ACL flag (R2
 * buckets are private by default — access is granted exclusively through
 * short-lived presigned URLs).
 *
 * Isolation rules (§11.4):
 * - Every object key is tenant-namespaced via tenantObjectKey()
 *   (`tenants/{organizationId}/…`, legacy fallback) — the organization
 *   comes from ambient server-side context and can never be supplied by a
 *   client.
 * - Private evidence stays private: nothing is ever public-read.
 */
@Injectable()
export class R2Strategy implements IFileUploadStrategy {
  private readonly logger = new Logger(R2Strategy.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly presignExpiresSeconds: number;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    this.bucket = process.env.R2_BUCKET ?? '';
    this.presignExpiresSeconds = Number(process.env.R2_PRESIGN_EXPIRES_SECONDS ?? 3600);

    if (!accountId || !this.bucket || !process.env.R2_ACCESS_KEY_ID) {
      this.logger.warn(
        'R2 storage strategy constructed without full configuration — uploads will fail until R2_ACCOUNT_ID/R2_BUCKET/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY are set.',
      );
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  getStrategyName(): string {
    return 'r2';
  }

  /** Tenant-scoped object key; folder/legacy handling mirrors PO-017. */
  private keyFor(publicIdOrKeyOrFolder: string, filename?: string): string {
    // A stored publicId IS the full key for R2.
    return publicIdOrKeyOrFolder;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<FileUploadResult> {
    const key = tenantObjectKey(folder, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // No ACL: R2 buckets are private; delivery is via presigned GET.
      }),
    );

    const url = await this.presignGet(key);
    return { url, publicId: key, size: file.size, mimeType: file.mimetype };
  }

  async deleteFile(publicIdOrUrl: string): Promise<void> {
    // Accept either a bare key or a URL containing one.
    const key = publicIdOrUrl.includes('/')
      ? publicIdOrUrl.replace(/^.*?tenants\//, 'tenants/').split('?')[0]
      : publicIdOrUrl;

    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /**
   * Short-lived signed GET for private objects. Expiry configurable via
   * R2_PRESIGN_EXPIRES_SECONDS (default 1h).
   */
  async getSignedUrl(key: string): Promise<string> {
    return s3Presign(
      this.s3Client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: this.presignExpiresSeconds },
    );
  }
}
