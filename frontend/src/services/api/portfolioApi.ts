import { baseApi } from './baseApi';
import { ENDPOINTS } from '@/constants/endpoints';
import type {
  EligibleFund,
  FlowTypeOption,
  PortfolioReview,
  PortfolioRecommendation,
  CreateRecommendationPayload,
} from '@/definitions/portfolioTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Normalizes an eligible fund object from either Node.js (camelCase) or Java (snake_case).
 */
function normalizeEligibleFund(f: any): EligibleFund {
  if (!f) return f;
  return {
    ...f,
    id: f.id,
    fundName: f.fundName ?? f.fund_name ?? '',
    isin: f.isin ?? '',
    fundSubCategory: f.fundSubCategory ?? f.fund_subcategory ?? '',
    assetClass: f.assetClass ?? f.asset_class ?? '',
    instrumentType: f.instrumentType ?? f.instrument_type ?? '',
    scoreCategory: f.scoreCategory ?? f.score_category ?? null,
  };
}

/**
 * Normalizes a portfolio review holding entry and top metrics from either Node.js (camelCase) or Java (snake_case).
 */
function normalizePortfolioReview(raw: any): PortfolioReview {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id,
    clientId: raw.clientId ?? raw.client_id,
    status: raw.status,
    totalInvested: Number(raw.totalInvested ?? raw.total_invested ?? 0),
    totalCurrentValue: Number(raw.totalCurrentValue ?? raw.total_current_value ?? 0),
    totalGain: Number(raw.totalGain ?? raw.total_gain ?? 0),
    gainPercentage: Number(raw.gainPercentage ?? raw.gain_percentage ?? 0),
    cagr: Number(raw.cagr ?? 0),
    note: raw.note ?? null,
    entries: (raw.entries ?? []).map((e: any) => ({
      ...e,
      id: e.id,
      fundName: e.fundName ?? e.fund_name ?? '',
      isin: e.isin ?? '',
      units: Number(e.units ?? 0),
      purchaseNav: Number(e.purchaseNav ?? e.purchase_nav ?? 0),
      currentNav: Number(e.currentNav ?? e.current_nav ?? 0),
      investedAmount: Number(e.investedAmount ?? e.invested_amount ?? 0),
      currentValue: Number(e.currentValue ?? e.current_value ?? 0),
      absReturnPct: Number(e.absReturnPct ?? e.abs_return_pct ?? 0),
      gain: Number(e.gain ?? 0),
      cagrPct: Number(e.cagrPct ?? e.cagr_pct ?? 0),
      holdingDays: Number(e.holdingDays ?? e.holding_days ?? 0),
      action: e.action,
    })),
    createdAt: raw.createdAt ?? raw.created_at ?? '',
  };
}

/**
 * Normalizes a portfolio recommendation proposal from either Node.js (camelCase) or Java (snake_case).
 */
function normalizeRecommendation(rec: any): PortfolioRecommendation {
  if (!rec) return rec;
  return {
    ...rec,
    id: rec.id,
    clientId: rec.clientId ?? rec.client_id,
    portfolioReviewId: rec.portfolioReviewId ?? rec.portfolio_review_id ?? null,
    flowType: rec.flowType ?? rec.flow_type,
    status: rec.status,
    investorCategory: rec.investorCategory ?? rec.investor_category ?? null,
    generatedDocumentUrl: rec.generatedDocumentUrl ?? rec.generated_document_url ?? null,
    createdAt: rec.createdAt ?? rec.created_at ?? '',
    funds: (rec.funds ?? []).map((item: any, idx: number) => ({
      id: item.id ?? idx + 1,
      eligibleFund: normalizeEligibleFund(item.eligibleFund ?? item.eligible_fund),
      amount: Number(item.amount ?? 0),
      replacesEntryId: item.replacesEntryId ?? item.replaces_entry_id ?? null,
      displayOrder: item.displayOrder ?? item.display_order ?? idx + 1,
    })),
  };
}

export const portfolioApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEligibleFunds: builder.query<EligibleFund[], { category?: string } | void>({
      query: (params) => ({
        url: ENDPOINTS.ELIGIBLE_FUNDS,
        params: params?.category ? { category: params.category } : undefined,
      }),
      transformResponse: (res: any[]) => (res ?? []).map(normalizeEligibleFund),
      providesTags: ['EligibleFunds'],
    }),

    getFlowTypes: builder.query<FlowTypeOption[], void>({
      query: () => ENDPOINTS.PORTFOLIO_FLOW_TYPES,
    }),

    getLatestReview: builder.query<PortfolioReview, string | number>({
      query: (clientId) => ENDPOINTS.PORTFOLIO_REVIEW_LATEST(clientId),
      transformResponse: (res: any) => normalizePortfolioReview(res),
      providesTags: (_result, _error, clientId) => [
        { type: 'PortfolioReview', id: `CLIENT_${clientId}` },
      ],
    }),

    getReviewHistory: builder.query<PortfolioReview[], string | number>({
      query: (clientId) => ENDPOINTS.PORTFOLIO_REVIEW_HISTORY(clientId),
      transformResponse: (res: any[]) => (res ?? []).map(normalizePortfolioReview),
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
      transformResponse: (res: any) => normalizePortfolioReview(res),
      invalidatesTags: (_result, _error, clientId) => [
        { type: 'PortfolioReview', id: `CLIENT_${clientId}` },
      ],
    }),

    getRecommendationsByClient: builder.query<PortfolioRecommendation[], string | number>({
      query: (clientId) => ({
        url: ENDPOINTS.PORTFOLIO_RECOMMENDATIONS,
        params: { clientId },
      }),
      transformResponse: (res: any[]) => (res ?? []).map(normalizeRecommendation),
      providesTags: (_result, _error, clientId) => [
        { type: 'PortfolioRecommendation', id: `CLIENT_${clientId}` },
      ],
    }),

    getRecommendationById: builder.query<PortfolioRecommendation, string | number>({
      query: (id) => ENDPOINTS.PORTFOLIO_RECOMMENDATION_DETAIL(id),
      transformResponse: (res: any) => normalizeRecommendation(res),
      providesTags: (_result, _error, id) => [
        { type: 'PortfolioRecommendation', id },
      ],
    }),

    createRecommendation: builder.mutation<PortfolioRecommendation, CreateRecommendationPayload>({
      query: (payload) => ({
        url: ENDPOINTS.PORTFOLIO_RECOMMENDATIONS,
        method: 'POST',
        // Polyglot interoperability payload: emits both camelCase (Node.js) and snake_case (Java Spring Boot)
        body: {
          ...payload,
          client_id: payload.clientId,
          portfolio_review_id: payload.portfolioReviewId,
          flow_type: payload.flowType,
          funds: payload.funds.map((f) => ({
            ...f,
            eligible_fund_id: f.eligibleFundId,
            replaces_entry_id: f.replacesEntryId,
            display_order: f.displayOrder,
          })),
        },
      }),
      transformResponse: (res: any) => normalizeRecommendation(res),
      invalidatesTags: (_result, _error, { clientId }) => [
        { type: 'PortfolioRecommendation', id: `CLIENT_${clientId}` },
      ],
    }),

    triggerPdfGeneration: builder.mutation<PortfolioRecommendation, string | number>({
      query: (id) => ({
        url: ENDPOINTS.PORTFOLIO_RECOMMENDATION_GENERATE_PDF(id),
        method: 'POST',
      }),
      transformResponse: (res: any) => normalizeRecommendation(res),
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
