import { Router } from 'express';
import { authenticate, requirePermission } from '../../../common/middleware/authMiddleware';
import {
  getGroupsDropdown,
  getRolesDropdown,
  getUsersDropdown,
} from '../controllers/dropdownController';
import {
  createGroup,
  getGroups,
  getGroupDetails,
  updateGroup,
  getGroupRoles,
} from '../controllers/groupController';
import {
  createRole,
  getRoleDetail,
  updateRole,
  setRolePermissions,
} from '../controllers/roleController';
import {
  createUser,
  getUsers,
  getAuthenticatedUser,
  getUserDetail,
  updateUser,
} from '../controllers/userController';
import { getPermissions } from '../controllers/permissionController';

const router = Router();

// Protect ALL routes in user-manager with JWT authentication
router.use(authenticate);

// ==========================================
// 1. Cascading Dropdown Routes (Form-level)
// ==========================================
router.get('/groups/dropdown', getGroupsDropdown);
router.get('/roles/dropdown', getRolesDropdown);
router.get('/users/dropdown', getUsersDropdown);

// ==========================================
// 2. Permissions Catalogue Route
// ==========================================
router.get('/permissions', requirePermission('role:read'), getPermissions);

// ==========================================
// 3. Group / Department CRUD
// ==========================================
router.get('/groups', requirePermission('crmgroup:read'), getGroups);
router.post('/groups', requirePermission('crmgroup:create'), createGroup);
router.get('/groups/:id', requirePermission('crmgroup:read'), getGroupDetails);
router.patch('/groups/:id', requirePermission('crmgroup:update'), updateGroup);
router.get('/groups/:id/roles', requirePermission('role:read'), getGroupRoles);

// ==========================================
// 4. Role CRUD & Permission Assignment
// ==========================================
router.post('/roles', requirePermission('role:create'), createRole);
router.get('/roles/:id', requirePermission('role:read'), getRoleDetail);
router.patch('/roles/:id', requirePermission('role:update'), updateRole);
router.post(
  '/roles/:id/set-permissions',
  requirePermission('rolepermission:update'),
  setRolePermissions
);

// ==========================================
// 5. User CRUD & Profile
// ==========================================
// Note: /users/me must precede /users/:id to avoid parameter collision
router.get('/users/me', getAuthenticatedUser);
router.get('/users', requirePermission('user:read'), getUsers);
router.post('/users', requirePermission('user:create'), createUser);
router.get('/users/:id', requirePermission('user:read'), getUserDetail);
router.patch('/users/:id', requirePermission('user:update'), updateUser);

export default router;
