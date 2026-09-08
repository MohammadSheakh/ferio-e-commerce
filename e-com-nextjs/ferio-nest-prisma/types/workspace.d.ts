import type { UserPayload } from '../libs/common/src/types/user-payload.type';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      uploadedFiles?: Record<string, Express.Multer.File[]>;
    }
  }
}

export {};
