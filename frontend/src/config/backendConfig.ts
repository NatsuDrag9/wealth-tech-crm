export type BackendTarget = 'java' | 'nodejs';

export const BACKEND_STORAGE_KEY = 'crm_active_backend';

export function getActiveBackend(): BackendTarget {
  const stored = localStorage.getItem(BACKEND_STORAGE_KEY);
  if (stored === 'java' || stored === 'nodejs') {
    return stored;
  }
  return (import.meta.env.VITE_DEFAULT_BACKEND as BackendTarget) || 'nodejs';
}

export function getBackendBaseUrl(target: BackendTarget): string {
  if (target === 'java') {
    return import.meta.env.VITE_JAVA_API_BASE_URL || 'http://localhost:8080/java-wtc-api/v1';
  }
  return import.meta.env.VITE_NODEJS_API_BASE_URL || 'http://localhost:5000/nodejs-wtc-api/v1';
}

export function getActiveBaseUrl(): string {
  return getBackendBaseUrl(getActiveBackend());
}

export function getBackendLabel(target: BackendTarget): string {
  return target === 'java' ? 'Java (Spring Boot)' : 'Node.js (Express)';
}

export function setStoredBackend(target: BackendTarget): void {
  localStorage.setItem(BACKEND_STORAGE_KEY, target);
}
