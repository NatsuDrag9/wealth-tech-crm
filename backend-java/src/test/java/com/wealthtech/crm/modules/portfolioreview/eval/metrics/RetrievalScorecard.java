package com.wealthtech.crm.modules.portfolioreview.eval.metrics;

import lombok.Builder;
import lombok.Data;

/**
 * Aggregated Information Retrieval Scorecard across an evaluation dataset.
 */
@Data
@Builder
public class RetrievalScorecard {
    private int totalQueries;
    private int k;
    private double meanRecallAtK;
    private double meanPrecisionAtK;
    private double meanNdcgAtK;
    private double meanReciprocalRank;

    public boolean meetsThresholds(double minRecall, double minPrecision, double minNdcg, double minMrr) {
        return meanRecallAtK >= minRecall
                && meanPrecisionAtK >= minPrecision
                && meanNdcgAtK >= minNdcg
                && meanReciprocalRank >= minMrr;
    }

    public String formatSummary() {
        return String.format(
                """
                === RETRIEVAL IR BENCHMARK SCORECARD (K=%d, N=%d) ===
                • Mean Recall@%d:     %.4f (Threshold: >= 0.85)
                • Mean Precision@%d:  %.4f (Threshold: >= 0.70)
                • Mean NDCG@%d:       %.4f (Threshold: >= 0.80)
                • Mean MRR:           %.4f (Threshold: >= 0.90)
                =====================================================
                """,
                k, totalQueries,
                k, meanRecallAtK,
                k, meanPrecisionAtK,
                k, meanNdcgAtK,
                meanReciprocalRank
        );
    }
}
