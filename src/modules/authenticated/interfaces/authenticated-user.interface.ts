import { PlatformRole, UserStatus } from '#app/generated/prisma/enums';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  fullName: string;
  status: UserStatus;
  platformRole: PlatformRole;
  sessionId: string;
  merchantId: string | null;
  merchantName: string | null;
  role: string | null;
  permissions: string[];
}
