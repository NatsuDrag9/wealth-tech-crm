import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { clientService } from '../services/clientService';
import { clientExcelService } from '../services/clientExcelService';
import { s3Service } from '../../../common/services/s3Service';
import { ClientStatus } from '../enums/clientEnums';

// 1. GET /clients - List clients with search, status/RM filtering, and cursor pagination
export const getClients = asyncHandler(async (req: Request, res: Response) => {
  const { status, rm_id, search, cursor, page_size } = req.query;

  const pageSize = page_size ? parseInt(page_size as string, 10) : undefined;
  const clientStatus = status ? (status as ClientStatus) : undefined;

  const response = await clientService.getClients({
    status: clientStatus,
    rmId: rm_id as string | undefined,
    search: search as string | undefined,
    cursor: cursor as string | undefined,
    pageSize,
  });

  return res.status(200).json(response);
});

// 2. GET /clients/:id - Get single client by ID
export const getClientById = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.getClientById(req.params.id);
  return res.status(200).json(client);
});

// 3. POST /clients - Create a new client
export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, phone } = req.body;

  if (!firstName || !lastName || !email || !phone) {
    logger.warn({ ip: req.ip }, 'Client creation failed: Missing required fields');
    throw new AppError('First name, last name, email, and phone are required', 400);
  }

  const currentUserId = req.user?._id ? req.user._id.toString() : undefined;
  const client = await clientService.createClient(req.body, currentUserId);
  return res.status(201).json(client);
});

// 4. PATCH /clients/:id/status - Update client operational status
export const updateClientStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;

  if (!status || !Object.values(ClientStatus).includes(status)) {
    logger.warn({ ip: req.ip, status }, 'Update client status failed: Invalid or missing status');
    throw new AppError('Valid client status is required', 400);
  }

  const client = await clientService.updateClientStatus(req.params.id, req.body);
  return res.status(200).json(client);
});

// 5. PATCH /clients/:id/rm - Update client relationship manager
export const updateClientRm = asyncHandler(async (req: Request, res: Response) => {
  const { rmId } = req.body;

  if (!rmId) {
    logger.warn({ ip: req.ip }, 'Update client RM failed: Missing rmId');
    throw new AppError('Relationship manager ID (rmId) is required', 400);
  }

  const client = await clientService.updateClientRm(req.params.id, req.body);
  return res.status(200).json(client);
});

// 6. GET /clients/:id/profile - Get client KYC & address profile
export const getClientProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await clientService.getClientProfile(req.params.id);
  return res.status(200).json(profile);
});

// 7. POST /clients/:id/profile/verify - Verify KYC status (approving promotes to ACTIVE)
export const verifyKyc = asyncHandler(async (req: Request, res: Response) => {
  const { kycStatus } = req.body;

  if (!kycStatus) {
    logger.warn({ ip: req.ip }, 'Verify KYC failed: Missing kycStatus');
    throw new AppError('kycStatus is required', 400);
  }

  const profile = await clientService.verifyKyc(req.params.id, req.body);
  return res.status(200).json(profile);
});

// 8. POST /clients/bulk-reassign - Bulk reassign RM
export const bulkReassignRm = asyncHandler(async (req: Request, res: Response) => {
  const { clientIds, newRmId } = req.body;

  if (!Array.isArray(clientIds) || clientIds.length === 0 || !newRmId) {
    logger.warn({ ip: req.ip }, 'Bulk reassign RM failed: Invalid input payload');
    throw new AppError('clientIds array and newRmId are required', 400);
  }

  const result = await clientService.bulkReassignRm(req.body);
  return res.status(200).json(result);
});

// 9. GET /clients/bulk-template - Download Excel template
export const downloadBulkTemplate = asyncHandler(async (_req: Request, res: Response) => {
  const excelBuffer = await clientExcelService.generateClientBulkTemplate();

  res.setHeader('Content-Disposition', 'attachment; filename="clients_bulk_template.xlsx"');
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  return res.status(200).send(excelBuffer);
});

// 10. POST /clients/bulk-upload - Upload Excel for async ingestion
export const uploadBulkClients = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    logger.warn({ ip: req.ip }, 'Bulk client upload failed: No file uploaded');
    throw new AppError('Please select an Excel file to upload', 400);
  }

  const originalName = req.file.originalname;
  if (!originalName.endsWith('.xlsx') && !originalName.endsWith('.xls')) {
    logger.warn({ filename: originalName, ip: req.ip }, 'Bulk client upload failed: Invalid file format');
    throw new AppError('Only Excel files (.xlsx, .xls) are supported', 400);
  }

  const currentUserId = req.user?._id ? req.user._id.toString() : undefined;
  const safeFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const s3Key = `client-uploads/${Date.now()}_${safeFilename}`;
  let presignedUrl: string | null = null;

  try {
    await s3Service.uploadFile({
      key: s3Key,
      buffer: req.file.buffer,
      contentType: req.file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    presignedUrl = await s3Service.getPresignedDownloadUrl(s3Key);
  } catch (s3Err: unknown) {
    const msg = s3Err instanceof Error ? s3Err.message : String(s3Err);
    logger.warn(
      { error: msg, s3Key },
      'S3 upload failed for client bulk upload. Proceeding with async database ingestion.'
    );
  }

  // Dispatch asynchronous background processing
  void clientService.processBulkUploadAsync(req.file.buffer, currentUserId);

  return res.status(202).json({
    status: 'PROCESSING',
    message: 'Bulk client upload is being processed in background',
    filename: originalName,
    s3Key,
    fileUrl: presignedUrl,
  });
});

// 11. GET /clients/bulk-uploads/download-url - Retrieve time-limited pre-signed URL for an uploaded batch file
export const getBulkUploadDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const key = typeof req.query.key === 'string' ? req.query.key : undefined;

  if (!key) {
    logger.warn({ ip: req.ip }, 'Get bulk upload download URL failed: Missing key query param');
    throw new AppError('Query parameter "key" is required', 400);
  }

  if (key.includes('..')) {
    logger.warn({ ip: req.ip, key }, 'Get bulk upload download URL rejected: Path traversal detected');
    throw new AppError('Invalid S3 key path', 400);
  }

  const fileUrl = await s3Service.getPresignedDownloadUrl(key);
  return res.status(200).json({ s3Key: key, fileUrl });
});
