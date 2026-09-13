import { baseApi } from './baseApi';
import { ENDPOINTS } from '@/constants/endpoints';
import type {
  ClientRecord,
  ClientsPaginatedResponse,
  GetClientsQueryParams,
  CreateClientPayload,
  UpdateClientStatusParams,
  UpdateClientRmParams,
  ClientProfileRecord,
  VerifyKycParams,
  BulkReassignPayload,
  BulkReassignResponse,
} from '@/definitions/clientTypes';

export const clientApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClients: builder.query<ClientsPaginatedResponse, GetClientsQueryParams | void>({
      query: (params) => ({
        url: ENDPOINTS.CLIENTS,
        params: {
          search: params?.search || undefined,
          status: params?.status || undefined,
          rm_id: params?.rmId ?? params?.rm_id ?? undefined,
          cursor: params?.cursor || undefined,
          page_size: params?.pageSize ?? params?.page_size ?? 50,
        },
      }),
      providesTags: (result) => (result
        ? [
          ...result.results.map(({ id }) => ({ type: 'Client' as const, id })),
          { type: 'Client', id: 'LIST' },
        ]
        : [{ type: 'Client', id: 'LIST' }]),
    }),

    getClientById: builder.query<ClientRecord, string | number>({
      query: (id) => ({ url: ENDPOINTS.CLIENT_DETAIL(id) }),
      providesTags: (_result, _error, id) => [{ type: 'Client', id }],
    }),

    createClient: builder.mutation<ClientRecord, CreateClientPayload>({
      query: (body) => ({
        url: ENDPOINTS.CLIENTS,
        method: 'POST',
        body: {
          ...body,
          first_name: body.firstName,
          last_name: body.lastName,
          date_of_birth: body.dateOfBirth,
          relationship_manager_id: body.relationshipManagerId,
          address_line: body.addressLine,
        },
      }),
      invalidatesTags: [{ type: 'Client', id: 'LIST' }],
    }),

    updateClientStatus: builder.mutation<ClientRecord, UpdateClientStatusParams>({
      query: ({ id, status }) => ({
        url: ENDPOINTS.CLIENT_STATUS(id),
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Client', id },
        { type: 'Client', id: 'LIST' },
      ],
    }),

    updateClientRm: builder.mutation<ClientRecord, UpdateClientRmParams>({
      query: ({ id, rmId }) => ({
        url: ENDPOINTS.CLIENT_RM(id),
        method: 'PATCH',
        body: {
          rmId,
          rm_id: rmId,
        },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Client', id },
        { type: 'Client', id: 'LIST' },
      ],
    }),

    getClientProfile: builder.query<ClientProfileRecord, string | number>({
      query: (id) => ({ url: ENDPOINTS.CLIENT_PROFILE(id) }),
      providesTags: (_result, _error, id) => [{ type: 'ClientProfile', id }],
    }),

    verifyKyc: builder.mutation<ClientProfileRecord, VerifyKycParams>({
      query: ({
        id,
        kycStatus,
        status,
        remarks,
      }) => ({
        url: ENDPOINTS.CLIENT_VERIFY_KYC(id),
        method: 'POST',
        body: {
          kycStatus: kycStatus ?? status,
          kyc_status: kycStatus ?? status,
          status: kycStatus ?? status,
          remarks,
        },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ClientProfile', id },
        { type: 'Client', id },
        { type: 'Client', id: 'LIST' },
      ],
    }),

    bulkReassignRm: builder.mutation<BulkReassignResponse, BulkReassignPayload>({
      query: ({ clientIds, newRmId }) => ({
        url: ENDPOINTS.CLIENT_BULK_REASSIGN,
        method: 'POST',
        body: {
          clientIds,
          client_ids: clientIds,
          newRmId,
          new_rm_id: newRmId,
        },
      }),
      invalidatesTags: [{ type: 'Client', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetClientsQuery,
  useGetClientByIdQuery,
  useCreateClientMutation,
  useUpdateClientStatusMutation,
  useUpdateClientRmMutation,
  useGetClientProfileQuery,
  useVerifyKycMutation,
  useBulkReassignRmMutation,
} = clientApi;
