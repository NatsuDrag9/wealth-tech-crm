import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { permissionService } from '../services/permissionService';

// GET /permissions - Returns complete catalogue of permissions for the checkbox matrix
export const getPermissions = asyncHandler(async (req: Request, res: Response) => {
  const permissions = await permissionService.getAllPermissions();
  return res.status(200).json(permissions);
});
