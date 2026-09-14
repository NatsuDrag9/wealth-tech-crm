import { baseApi } from './baseApi';
import { ENDPOINTS } from '@/constants/endpoints';
import { setCredentials, logout } from '@/store/slices/authSlice';
import type { AuthResponse, LoginPayload } from '@/definitions/authTypes';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginPayload>({
      query: (credentials) => ({
        url: ENDPOINTS.LOGIN,
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const token = data.accessToken || data.access_token || '';
          const user = data.user || {
            id: data.email || '1',
            email: data.email || '',
            role: data.role,
          };
          dispatch(
            setCredentials({
              user,
              accessToken: token,
              permissions: data.permissions || [],
            }),
          );
        } catch {
          // Failure handled by component / error banner
        }
      },
    }),

    logoutServer: builder.mutation<{ message?: string }, void>({
      query: () => ({
        url: ENDPOINTS.LOGOUT,
        method: 'POST',
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(logout());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutServerMutation,
} = authApi;
