import { Permission } from '../models/Permission';
import { logger } from '../../../common/utils/logger';

const PERMISSIONS_DATA = [
  // Clients
  { codename: 'client:read', name: 'View Client', contentType: 'client' },
  { codename: 'client:create', name: 'Create Client', contentType: 'client' },
  { codename: 'client:update', name: 'Update Client', contentType: 'client' },
  { codename: 'client:delete', name: 'Delete Client', contentType: 'client' },

  // Client Profiles
  { codename: 'clientprofile:read', name: 'View Client Profile', contentType: 'clientprofile' },
  { codename: 'clientprofile:create', name: 'Create Client Profile', contentType: 'clientprofile' },
  { codename: 'clientprofile:update', name: 'Update Client Profile', contentType: 'clientprofile' },
  { codename: 'clientprofile:delete', name: 'Delete Client Profile', contentType: 'clientprofile' },

  // Risk Appetite
  { codename: 'riskappetite:read', name: 'View Risk Appetite', contentType: 'riskappetite' },
  { codename: 'riskappetite:create', name: 'Create Risk Appetite', contentType: 'riskappetite' },
  { codename: 'riskappetite:update', name: 'Update Risk Appetite', contentType: 'riskappetite' },
  { codename: 'riskappetite:delete', name: 'Delete Risk Appetite', contentType: 'riskappetite' },

  // Portfolio Review & Entry
  { codename: 'portfolioreview:read', name: 'View Portfolio Review', contentType: 'portfolioreview' },
  { codename: 'portfolioreview:create', name: 'Create Portfolio Review', contentType: 'portfolioreview' },
  { codename: 'portfolioreview:update', name: 'Update Portfolio Review', contentType: 'portfolioreview' },
  { codename: 'portfolioreview:delete', name: 'Delete Portfolio Review', contentType: 'portfolioreview' },

  { codename: 'portfolioentry:read', name: 'View Portfolio Entry', contentType: 'portfolioentry' },
  { codename: 'portfolioentry:create', name: 'Create Portfolio Entry', contentType: 'portfolioentry' },
  { codename: 'portfolioentry:update', name: 'Update Portfolio Entry', contentType: 'portfolioentry' },
  { codename: 'portfolioentry:delete', name: 'Delete Portfolio Entry', contentType: 'portfolioentry' },

  // Tasks & Notes
  { codename: 'task:read', name: 'View Task', contentType: 'task' },
  { codename: 'task:create', name: 'Create Task', contentType: 'task' },
  { codename: 'task:update', name: 'Update Task', contentType: 'task' },
  { codename: 'task:delete', name: 'Delete Task', contentType: 'task' },

  { codename: 'note:read', name: 'View Note', contentType: 'note' },
  { codename: 'note:create', name: 'Create Note', contentType: 'note' },
  { codename: 'note:update', name: 'Update Note', contentType: 'note' },
  { codename: 'note:delete', name: 'Delete Note', contentType: 'note' },

  // User Management
  { codename: 'user:read', name: 'View User', contentType: 'user' },
  { codename: 'user:create', name: 'Create User', contentType: 'user' },
  { codename: 'user:update', name: 'Update User', contentType: 'user' },
  { codename: 'user:delete', name: 'Delete User', contentType: 'user' },

  { codename: 'userprofile:read', name: 'View User Profile', contentType: 'userprofile' },

  { codename: 'crmgroup:read', name: 'View CRM Group', contentType: 'crmgroup' },
  { codename: 'crmgroup:create', name: 'Create CRM Group', contentType: 'crmgroup' },
  { codename: 'crmgroup:update', name: 'Update CRM Group', contentType: 'crmgroup' },
  { codename: 'crmgroup:delete', name: 'Delete CRM Group', contentType: 'crmgroup' },

  { codename: 'role:read', name: 'View Role', contentType: 'role' },
  { codename: 'role:create', name: 'Create Role', contentType: 'role' },
  { codename: 'role:update', name: 'Update Role', contentType: 'role' },
  { codename: 'role:delete', name: 'Delete Role', contentType: 'role' },

  { codename: 'rolepermission:read', name: 'View Role Permission', contentType: 'rolepermission' },
  { codename: 'rolepermission:create', name: 'Create Role Permission', contentType: 'rolepermission' },
  { codename: 'rolepermission:update', name: 'Update Role Permission', contentType: 'rolepermission' },
  { codename: 'rolepermission:delete', name: 'Delete Role Permission', contentType: 'rolepermission' },
];

export const seedPermissions = async (): Promise<void> => {
  try {
    const count = await Permission.countDocuments();
    if (count > 0) {
      return;
    }

    await Permission.insertMany(PERMISSIONS_DATA);
    logger.info({ count: PERMISSIONS_DATA.length }, 'Permissions catalogue seeded successfully');
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error({ error: err }, 'Failed to seed permissions catalogue');
  }
};
