import { Permission, IPermission } from '../models/Permission';
import { logger } from '../../../common/utils/logger';

export class PermissionService {
  /**
   * Retrieves the full catalogue of permissions sorted by contentType and codename.
   * Used by frontend to render the permission checkbox matrix for role configuration.
   */
  async getAllPermissions(): Promise<IPermission[]> {
    logger.debug('Fetching complete permission catalogue');
    return Permission.find().sort({ contentType: 1, codename: 1 });
  }
}

export const permissionService = new PermissionService();
