import { Router } from 'express';
import multer from 'multer';
import { authenticate, requirePermission } from '../../../common/middleware/authMiddleware';
import {
  getClients,
  getClientById,
  createClient,
  updateClientStatus,
  updateClientRm,
  getClientProfile,
  verifyKyc,
  bulkReassignRm,
  downloadBulkTemplate,
  uploadBulkClients,
} from '../controllers/clientController';

const router = Router();

// In-memory storage for bulk client uploads via Excel (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// All routes require authentication
router.use(authenticate);

// 1. Static and bulk collection routes (precedes /:id to prevent path collision)
router.get('/bulk-template', requirePermission('client:create'), downloadBulkTemplate);
router.post(
  '/bulk-upload',
  requirePermission('client:create'),
  upload.single('file'),
  uploadBulkClients
);
router.post('/bulk-reassign', requirePermission('client:update'), bulkReassignRm);

// 2. Collection CRUD routes
router.get('/', requirePermission('client:read'), getClients);
router.post('/', requirePermission('client:create'), createClient);

// 3. KYC profile routes
router.get('/:id/profile', requirePermission('clientprofile:read'), getClientProfile);
router.post('/:id/profile/verify', requirePermission('clientprofile:update'), verifyKyc);

// 4. Parameterized client resource routes
router.get('/:id', requirePermission('client:read'), getClientById);
router.patch('/:id/status', requirePermission('client:update'), updateClientStatus);
router.patch('/:id/rm', requirePermission('client:update'), updateClientRm);

export default router;
