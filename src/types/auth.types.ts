export interface PublicUser {
  id: string;
  name: string;
  email: string;
  platformRole: 'SUPER_ADMIN' | null;
  organizationId: string | null;
}

export interface AuthSessionResponse {
  accessToken: string;
  user: PublicUser;
}
