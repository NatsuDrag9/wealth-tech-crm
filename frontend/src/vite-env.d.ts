/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL?: string;
  readonly VITE_JAVA_API_BASE_URL?: string;
  readonly VITE_NODEJS_API_BASE_URL?: string;
  readonly VITE_DEFAULT_BACKEND?: 'java' | 'nodejs';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
