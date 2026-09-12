import { isFulfilled, isRejectedWithValue, Middleware } from '@reduxjs/toolkit';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/rtkMiddleware';
import { showSuccessToast, showErrorToast } from '@/utils/toastUtils';
import { logError } from '@/utils/logUtils';
import { ApiErrorResponse } from '@/definitions/commonTypes';

interface MutationMeta {
  arg?: {
    endpointName?: string;
  };
}

interface RejectedPayload {
  status?: number | string;
  data?: ApiErrorResponse;
}

export const toastMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action);

  if (isFulfilled(action)) {
    const meta = (action as { meta?: MutationMeta }).meta;
    const endpointName = meta?.arg?.endpointName;

    if (endpointName && SUCCESS_MESSAGES[endpointName]) {
      showSuccessToast(SUCCESS_MESSAGES[endpointName]);
    }
  }

  if (isRejectedWithValue(action)) {
    const meta = (action as { meta?: MutationMeta }).meta;
    const endpointName = meta?.arg?.endpointName;
    const payload = (action as { payload?: RejectedPayload }).payload;

    const customMessage = endpointName ? ERROR_MESSAGES[endpointName] : undefined;
    const serverMessage = payload?.data?.message || payload?.data?.detail;

    if (customMessage || serverMessage) {
      showErrorToast(serverMessage || customMessage || 'An unexpected error occurred.');
    }
  }

  return result;
};

export const rtkQueryErrorLogger: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const meta = (action as { meta?: MutationMeta }).meta;
    const payload = (action as { payload?: RejectedPayload }).payload;

    logError(`RTK Query Error on endpoint: ${meta?.arg?.endpointName ?? 'unknown'}`, {
      status: payload?.status,
      data: payload?.data,
    });
  }

  return next(action);
};
