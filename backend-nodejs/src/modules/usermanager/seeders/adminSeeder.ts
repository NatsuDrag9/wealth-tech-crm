import { Group } from '../models/Group';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { User } from '../models/User';
import { logger } from '../../../common/utils/logger';

export const seedAdmin = async (): Promise<void> => {
  try {
    // 1. Ensure Administration Group exists
    let adminGroup = await Group.findOne({ name: 'Administration' });
    if (!adminGroup) {
      adminGroup = await Group.create({
        name: 'Administration',
        description: 'Executive Management and IT System Administration',
      });
      logger.info('Administration group created');
    }

    // 2. Fetch all system permissions
    const allPermissions = await Permission.find();
    const permissionIds = allPermissions.map((p) => p._id);

    // 3. Ensure ADMIN Role exists and has all permissions
    let adminRole = await Role.findOne({ name: 'ADMIN' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'ADMIN',
        description: 'Super Administrator with unrestricted access across all CRM modules',
        group: adminGroup._id,
        permissions: permissionIds,
      });
      logger.info({ permissionCount: permissionIds.length }, 'ADMIN role created with full permissions');
    } else {
      // Keep permissions updated if new permissions were seeded
      adminRole.permissions = permissionIds;
      await adminRole.save();
    }

    // 4. Ensure Default Admin User exists
    const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@wealthtech.com').toLowerCase();
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';
      await User.create({
        email: adminEmail,
        password: defaultPassword,
        fullName: 'System Administrator',
        group: adminGroup._id,
        role: adminRole._id,
        languages: ['English', 'Hindi'],
      });
      logger.info({ email: adminEmail }, 'Default administrator account provisioned successfully');
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error({ error: err }, 'Failed to seed default admin role and user');
  }
};
