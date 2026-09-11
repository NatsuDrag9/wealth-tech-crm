import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { Permission } from '../models/Permission';

// GET /permissions - Returns complete catalogue of permissions for the checkbox matrix
export const getPermissions = asyncHandler(async (req: Request, res: Response) => {
  const permissions = await Permission.find().sort({ contentType: 1, codename: 1 });
  res.status(200).json(permissions);
});
