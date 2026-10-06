import { logger } from '../../../common/utils/logger';
import {
  ragEvalFaithfulnessScore,
  ragEvalRelevancyScore,
  ragEvalIrRecall,
  ragEvalIrNdcg,
  ragEvalIrMrr,
  ragEvalRunsTotal,
  ragEvalDurationSeconds,
} from '../../../common/metrics/metrics';

/**
 * Service for collecting, recording, and publishing RAG pipeline evaluation metrics
 * to Prometheus (via /nodejs-wtc-api/v1/metrics) and Loki structured logs.
 * Metrics match the unified schema established across the dual-backend architecture.
 */
export class RagEvaluationTelemetryService {
  private latestFaithfulness = 1.0;
  private latestRelevancy = 1.0;
  private latestRecall = 1.0;
  private latestNdcg = 1.0;
  private latestMrr = 1.0;

  constructor() {
    ragEvalFaithfulnessScore.set(this.latestFaithfulness);
    ragEvalRelevancyScore.set(this.latestRelevancy);
    ragEvalIrRecall.set({ k: '5' }, this.latestRecall);
    ragEvalIrNdcg.set({ k: '5' }, this.latestNdcg);
    ragEvalIrMrr.set(this.latestMrr);
  }

  public recordFaithfulness(score: number, pass: boolean, judgeType: string, durationMs: number): void {
    this.latestFaithfulness = score;
    ragEvalFaithfulnessScore.set(score);
    ragEvalRunsTotal.inc({
      evaluator: 'fact_checking',
      judge_type: judgeType.toLowerCase(),
      verdict: pass ? 'pass' : 'fail',
    });
    ragEvalDurationSeconds.observe({ evaluator: 'fact_checking' }, durationMs / 1000.0);

    logger.info(
      { score, pass, judgeType, durationMs },
      'Recorded RAG faithfulness evaluation telemetry to Prometheus and Loki'
    );
  }

  public recordRelevancy(score: number, pass: boolean, judgeType: string, durationMs: number): void {
    this.latestRelevancy = score;
    ragEvalRelevancyScore.set(score);
    ragEvalRunsTotal.inc({
      evaluator: 'relevancy',
      judge_type: judgeType.toLowerCase(),
      verdict: pass ? 'pass' : 'fail',
    });
    ragEvalDurationSeconds.observe({ evaluator: 'relevancy' }, durationMs / 1000.0);

    logger.info(
      { score, pass, judgeType, durationMs },
      'Recorded RAG answer relevancy evaluation telemetry to Prometheus and Loki'
    );
  }

  public recordRetrievalMetrics(recallAtK: number, ndcgAtK: number, mrr: number): void {
    this.latestRecall = recallAtK;
    this.latestNdcg = ndcgAtK;
    this.latestMrr = mrr;

    ragEvalIrRecall.set({ k: '5' }, recallAtK);
    ragEvalIrNdcg.set({ k: '5' }, ndcgAtK);
    ragEvalIrMrr.set(mrr);

    logger.info(
      { recallAtK, ndcgAtK, mrr },
      'Recorded RAG retrieval IR evaluation benchmark metrics to Prometheus and Loki'
    );
  }

  public getLatestFaithfulnessScore(): number {
    return this.latestFaithfulness;
  }

  public getLatestRelevancyScore(): number {
    return this.latestRelevancy;
  }

  public getLatestIrRecall(): number {
    return this.latestRecall;
  }

  public getLatestIrNdcg(): number {
    return this.latestNdcg;
  }

  public getLatestIrMrr(): number {
    return this.latestMrr;
  }
}

export const ragEvaluationTelemetryService = new RagEvaluationTelemetryService();
