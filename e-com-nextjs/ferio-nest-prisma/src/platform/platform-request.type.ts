import type { Request } from 'express';
import type { PlatformPrincipal } from './guards/platform-auth.guard';

export type PlatformRequest = Request & {
  platformPrincipal?: PlatformPrincipal;
  user?: { platformUserId?: string; userId?: string };
};
