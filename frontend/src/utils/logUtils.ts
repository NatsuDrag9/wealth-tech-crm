type LogMetadata = Record<string, unknown>;

export const logInfo = (message: string, meta?: LogMetadata): void => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(`[INFO] ${message}`, meta ?? '');
  }
};

export const logWarn = (message: string, meta?: LogMetadata): void => {
  // eslint-disable-next-line no-console
  console.warn(`[WARN] ${message}`, meta ?? '');
};

export const logError = (message: string, error?: unknown, meta?: LogMetadata): void => {
  // eslint-disable-next-line no-console
  console.error(`[ERROR] ${message}`, { error, ...meta });
};
