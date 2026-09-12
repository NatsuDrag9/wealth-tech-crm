import { PermissionCode } from '@/constants/authConstants';

export interface PermissionItem {
  id: number | string;
  codename: PermissionCode;
  name: string;
  content_type: string;
}

export interface CategorizedPermissions {
  contentType: string;
  permissions: PermissionItem[];
}
