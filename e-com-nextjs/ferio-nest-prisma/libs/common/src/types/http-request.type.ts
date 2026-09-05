import type { Request } from 'express';
import type { UserPayload } from './user-payload.type';

export type AuthenticatedRequest = Request & {
  user?: UserPayload;
  tenantOrganizationId?: string;
};

export type UploadRequest = AuthenticatedRequest & {
  files?: Record<string, Express.Multer.File[]>;
  uploadedFiles?: Record<string, Express.Multer.File[]>;
};
