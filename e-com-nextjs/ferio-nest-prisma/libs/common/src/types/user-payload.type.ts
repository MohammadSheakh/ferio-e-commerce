export interface UserPayload {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
  sessionVersion?: number;
  organizationId?: string;
  iat?: number;
  exp?: number;
}
