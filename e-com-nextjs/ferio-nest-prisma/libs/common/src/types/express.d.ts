import type { UserPayload } from './user-payload.type';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      uploadedFiles?: Record<string, Express.Multer.File[]>;
    }
  }
}

export {};
