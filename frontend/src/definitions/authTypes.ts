import { PermissionCode } from '@/constants/authConstants';

export interface UserSummary {
  id: number | string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  group?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type?: string;
  message?: string;
  user: UserSummary;
  role?: string;
  permissions: PermissionCode[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  permissions: PermissionCode[];
  isAuthenticated: boolean;
}
