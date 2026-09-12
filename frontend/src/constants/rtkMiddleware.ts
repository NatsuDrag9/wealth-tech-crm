/**
 * Toast notification dictionaries for RTK Query mutations.
 * Keyed by mutation endpoint name.
 */
export const SUCCESS_MESSAGES: Record<string, string> = {
  login: 'Welcome back! You have successfully logged in.',
  logout: 'You have been logged out.',
  createClient: 'Client registered successfully.',
  updateClientStatus: 'Client status updated.',
  updateClientRm: 'Relationship Manager reassigned.',
  verifyKyc: 'KYC status verified successfully.',
  bulkReassignRm: 'Clients reassigned successfully.',
  uploadBulkClients: 'Bulk client spreadsheet submitted for processing.',
  submitAnswer: 'Answer saved.',
  completeAssessment: 'Risk assessment completed successfully!',
  createRecommendation: 'Portfolio recommendation proposal saved.',
  triggerPdfGeneration: 'PDF generation initiated.',
  createGroup: 'Department group created.',
  updateGroup: 'Department group updated.',
  createRole: 'Role created.',
  updateRole: 'Role updated.',
  setRolePermissions: 'Role permissions saved successfully.',
  createUser: 'User created successfully.',
  updateUser: 'User profile updated.',
};

export const ERROR_MESSAGES: Record<string, string> = {
  login: 'Authentication failed. Please check your credentials.',
  createClient: 'Failed to create client.',
  updateClientStatus: 'Failed to update client status.',
  updateClientRm: 'Failed to update Relationship Manager.',
  verifyKyc: 'Failed to verify KYC status.',
  bulkReassignRm: 'Failed to reassign clients.',
  uploadBulkClients: 'Failed to upload client spreadsheet.',
  submitAnswer: 'Failed to save answer.',
  completeAssessment: 'Failed to complete risk assessment.',
  createRecommendation: 'Failed to save portfolio recommendation.',
  triggerPdfGeneration: 'Failed to generate recommendation PDF.',
  setRolePermissions: 'Failed to update role permissions.',
};
