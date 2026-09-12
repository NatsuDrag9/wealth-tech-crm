import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { setCredentials, logout } from '@/store/slices/authSlice';
import { logWarn, logError } from '@/utils/logUtils';
import { AuthResponse } from '@/definitions/authTypes';
import { ENDPOINTS } from '@/constants/endpoints';

interface AuthSliceState {
  auth: {
    accessToken: string | null;
  };
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_BASE_URL || '/api/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as AuthSliceState).auth?.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

let refreshPromise: Promise<boolean> | null = null;

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const url = typeof args === 'string' ? args : args.url;
    // Do not attempt refresh if the failed request was already login or refresh
    if (url.includes(ENDPOINTS.LOGIN) || url.includes(ENDPOINTS.REFRESH)) {
      return result;
    }

    logWarn(`401 Unauthorized encountered on ${url}. Attempting token refresh.`);

    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshResult = await rawBaseQuery(
            { url: ENDPOINTS.REFRESH, method: 'POST' },
            api,
            extraOptions
          );

          if (refreshResult.data) {
            const data = refreshResult.data as AuthResponse;
            api.dispatch(
              setCredentials({
                user: data.user,
                accessToken: data.access_token,
                permissions: data.permissions,
              })
            );
            return true;
          }
          api.dispatch(logout());
          return false;
        } catch (err) {
          logError('Error executing silent token refresh', err);
          api.dispatch(logout());
          return false;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      // Retry original request with fresh access token
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Client',
    'ClientProfile',
    'RiskAssessment',
    'RiskQuestions',
    'PortfolioReview',
    'PortfolioRecommendation',
    'EligibleFunds',
    'User',
    'Group',
    'Role',
    'Permission',
    'AuthenticatedUser',
  ],
  endpoints: () => ({}),
});
