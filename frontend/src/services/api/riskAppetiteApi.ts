import { baseApi } from './baseApi';
import { ENDPOINTS } from '@/constants/endpoints';
import type {
  RiskQuestion,
  StartAssessmentPayload,
  StartAssessmentResponse,
  SubmitAnswerParams,
  CompleteAssessmentParams,
  AssessmentResultResponse,
} from '@/definitions/riskAppetiteTypes';

export const riskAppetiteApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRiskQuestions: builder.query<RiskQuestion[], void>({
      query: () => ENDPOINTS.RISK_QUESTIONS,
    }),

    getLatestAssessment: builder.query<AssessmentResultResponse, string | number>({
      query: (clientId) => ENDPOINTS.RISK_ASSESSMENT_LATEST(clientId),
      providesTags: (_result, _error, clientId) => [
        { type: 'RiskAssessment', id: `CLIENT_${clientId}` },
      ],
    }),

    getAssessmentResult: builder.query<AssessmentResultResponse, string | number>({
      query: (raId) => ENDPOINTS.RISK_ASSESSMENT_RESULTS(raId),
      providesTags: (_result, _error, raId) => [
        { type: 'RiskAssessment', id: raId },
      ],
    }),

    startAssessment: builder.mutation<StartAssessmentResponse, StartAssessmentPayload>({
      query: (payload) => ({
        url: ENDPOINTS.RISK_ASSESSMENT_START,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { clientId }) => [
        { type: 'RiskAssessment', id: `CLIENT_${clientId}` },
      ],
    }),

    submitAnswer: builder.mutation<{ message?: string }, SubmitAnswerParams>({
      query: ({ raId, questionId, optionId }) => ({
        url: ENDPOINTS.RISK_ASSESSMENT_SUBMIT(raId),
        method: 'POST',
        body: { questionId, optionId },
      }),
    }),

    completeAssessment: builder.mutation<AssessmentResultResponse, CompleteAssessmentParams>({
      query: ({ raId }) => ({
        url: ENDPOINTS.RISK_ASSESSMENT_COMPLETE(raId),
        method: 'POST',
      }),
      invalidatesTags: (result, _error, { raId }) => [
        { type: 'RiskAssessment', id: raId },
        ...(result?.clientId
          ? [{ type: 'RiskAssessment' as const, id: `CLIENT_${result.clientId}` }]
          : []),
      ],
    }),
  }),
});

export const {
  useGetRiskQuestionsQuery,
  useGetLatestAssessmentQuery,
  useGetAssessmentResultQuery,
  useStartAssessmentMutation,
  useSubmitAnswerMutation,
  useCompleteAssessmentMutation,
} = riskAppetiteApi;
