/**
 * Centralized API endpoints for WealthTech CRM.
 * Aligned identically across both Java Spring Boot (/api/v1) and Node.js/Express backends.
 */
export const ENDPOINTS = {
  // Auth
  LOGIN: 'auth/login',
  REFRESH: 'auth/refresh',
  LOGOUT: 'auth/logout',

  // User Management & Cascading Dropdowns
  USERS_ME: 'users/me',
  USERS: 'users',
  USER_DETAIL: (id: string | number) => `users/${id}`,
  USERS_DROPDOWN: 'users/dropdown',

  GROUPS: 'groups',
  GROUP_DETAIL: (id: string | number) => `groups/${id}`,
  GROUP_ROLES: (groupId: string | number) => `groups/${groupId}/roles`,
  GROUPS_DROPDOWN: 'groups/dropdown',

  ROLES: 'roles',
  ROLE_DETAIL: (id: string | number) => `roles/${id}`,
  ROLE_PERMISSIONS: (roleId: string | number) => `roles/${roleId}/set-permissions`,
  ROLES_DROPDOWN: 'roles/dropdown',

  PERMISSIONS: 'permissions',

  // Client Lifecycle & KYC
  CLIENTS: 'clients',
  CLIENT_DETAIL: (id: string | number) => `clients/${id}`,
  CLIENT_STATUS: (id: string | number) => `clients/${id}/status`,
  CLIENT_RM: (id: string | number) => `clients/${id}/rm`,
  CLIENT_PROFILE: (id: string | number) => `clients/${id}/profile`,
  CLIENT_VERIFY_KYC: (id: string | number) => `clients/${id}/profile/verify`,
  CLIENT_BULK_TEMPLATE: 'clients/bulk-template',
  CLIENT_BULK_UPLOAD: 'clients/bulk-upload',
  CLIENT_BULK_REASSIGN: 'clients/bulk-reassign',

  // Risk Appetite Assessment
  RISK_QUESTIONS: 'risk-questions',
  RISK_ASSESSMENT_START: 'risk-assessments/start-assessment',
  RISK_ASSESSMENT_SUBMIT: (raId: string | number) => `risk-assessments/${raId}/submit-answer`,
  RISK_ASSESSMENT_COMPLETE: (raId: string | number) => `risk-assessments/${raId}/complete-assessment`,
  RISK_ASSESSMENT_LATEST: (clientId: string | number) => `risk-assessments/clients/${clientId}/latest`,
  RISK_ASSESSMENT_RESULTS: (raId: string | number) => `risk-assessments/${raId}/results`,

  // Portfolio Review & Recommendation Proposals
  ELIGIBLE_FUNDS: 'eligible-funds',
  PORTFOLIO_FLOW_TYPES: 'portfolio-recommendations/flow-types',
  PORTFOLIO_REVIEW: (id: string | number) => `portfolio-reviews/${id}`,
  PORTFOLIO_REVIEW_LATEST: (clientId: string | number) => `portfolio-reviews/client/${clientId}/latest`,
  PORTFOLIO_REVIEW_HISTORY: (clientId: string | number) => `portfolio-reviews/client/${clientId}`,
  PORTFOLIO_RECOMMENDATIONS: 'portfolio-recommendations',
  PORTFOLIO_RECOMMENDATION_DETAIL: (id: string | number) => `portfolio-recommendations/${id}`,
  PORTFOLIO_RECOMMENDATION_GENERATE_PDF: (id: string | number) => `portfolio-recommendations/${id}/generate-pdf`,
} as const;
