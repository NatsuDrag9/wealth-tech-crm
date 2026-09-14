import { baseApi } from './baseApi';
import { ENDPOINTS } from '@/constants/endpoints';
import type {
  EligibleFund,
  FlowTypeOption,
  PortfolioReview,
  PortfolioRecommendation,
  CreateRecommendationPayload,
} from '@/definitions/portfolioTypes';

export const portfolioApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEligibleFunds: builder.query<EligibleFund[], { category?: string } | void>({
      query: (params) => ({
        url: ENDPOINTS.ELIGIBLE_FUNDS,
        params: params?.category ? { category: params.category } : undefined,
      }),
      providesTags: ['EligibleFunds'],
    }),

    getFlowTypes: builder.query<FlowTypeOption[], void>({
      query: () => ENDPOINTS.PORTFOLIO_FLOW_TYPES,
    }),

    getLatestReview: builder.query<PortfolioReview, string | number>({
      query: (clientId) => ENDPOINTS.PORTFOLIO_REVIEW_LATEST(clientId),
      providesTags: (_result, _error, clientId) => [
        { type: 'PortfolioReview', id: `CLIENT_${clientId}` },
      ],
    }),

    getReviewHistory: builder.query<PortfolioReview[], string | number>({
      query: (clientId) => ENDPOINTS.PORTFOLIO_REVIEW_HISTORY(clientId),
      providesTags: (_result, _error, clientId) => [
        { type: 'PortfolioReview', id: `CLIENT_${clientId}` },
      ],
    }),

    createSampleReview: builder.mutation<PortfolioReview, string | number>({
      query: (clientId) => ({
        url: 'portfolio-reviews/sample',
        method: 'POST',
        params: { clientId },
      }),
      invalidatesTags: (_result, _error, clientId) => [
        { type: 'PortfolioReview', id: `CLIENT_${clientId}` },
      ],
    }),

    getRecommendationsByClient: builder.query<PortfolioRecommendation[], string | number>({
      query: (clientId) => ({
        url: ENDPOINTS.PORTFOLIO_RECOMMENDATIONS,
        params: { clientId },
      }),
      providesTags: (_result, _error, clientId) => [
        { type: 'PortfolioRecommendation', id: `CLIENT_${clientId}` },
      ],
    }),

    getRecommendationById: builder.query<PortfolioRecommendation, string | number>({
      query: (id) => ENDPOINTS.PORTFOLIO_RECOMMENDATION_DETAIL(id),
      providesTags: (_result, _error, id) => [
        { type: 'PortfolioRecommendation', id },
      ],
    }),

    createRecommendation: builder.mutation<PortfolioRecommendation, CreateRecommendationPayload>({
      query: (payload) => ({
        url: ENDPOINTS.PORTFOLIO_RECOMMENDATIONS,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { clientId }) => [
        { type: 'PortfolioRecommendation', id: `CLIENT_${clientId}` },
      ],
    }),

    triggerPdfGeneration: builder.mutation<PortfolioRecommendation, string | number>({
      query: (id) => ({
        url: ENDPOINTS.PORTFOLIO_RECOMMENDATION_GENERATE_PDF(id),
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'PortfolioRecommendation', id },
      ],
    }),
  }),
});

export const {
  useGetEligibleFundsQuery,
  useGetFlowTypesQuery,
  useGetLatestReviewQuery,
  useGetReviewHistoryQuery,
  useCreateSampleReviewMutation,
  useGetRecommendationsByClientQuery,
  useGetRecommendationByIdQuery,
  useCreateRecommendationMutation,
  useTriggerPdfGenerationMutation,
} = portfolioApi;
