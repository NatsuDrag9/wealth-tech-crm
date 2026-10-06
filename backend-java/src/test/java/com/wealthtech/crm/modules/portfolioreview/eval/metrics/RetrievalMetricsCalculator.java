package com.wealthtech.crm.modules.portfolioreview.eval.metrics;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Pure Java Information Retrieval (IR) metrics engine.
 * Computes Recall@K, Precision@K, NDCG@K, and Reciprocal Rank (RR) without any external dependencies.
 */
public class RetrievalMetricsCalculator {

    /**
     * Calculates Recall at rank K.
     * Recall@K = |Retrieved@K ∩ GroundTruth| / |GroundTruth|
     */
    public static <T> double calculateRecallAtK(List<T> retrieved, Collection<T> groundTruth, int k) {
        if (groundTruth == null || groundTruth.isEmpty()) {
            return 1.0;
        }
        if (retrieved == null || retrieved.isEmpty() || k <= 0) {
            return 0.0;
        }

        int limit = Math.min(k, retrieved.size());
        List<T> topK = retrieved.subList(0, limit);
        Set<T> truthSet = new HashSet<>(groundTruth);

        long intersectionCount = topK.stream().filter(truthSet::contains).distinct().count();
        return (double) intersectionCount / truthSet.size();
    }

    /**
     * Calculates Precision at rank K.
     * Precision@K = |Retrieved@K ∩ GroundTruth| / K
     */
    public static <T> double calculatePrecisionAtK(List<T> retrieved, Collection<T> groundTruth, int k) {
        if (k <= 0) {
            return 0.0;
        }
        if (retrieved == null || retrieved.isEmpty() || groundTruth == null || groundTruth.isEmpty()) {
            return 0.0;
        }

        int limit = Math.min(k, retrieved.size());
        List<T> topK = retrieved.subList(0, limit);
        Set<T> truthSet = new HashSet<>(groundTruth);

        long intersectionCount = topK.stream().filter(truthSet::contains).distinct().count();
        return (double) intersectionCount / k;
    }

    /**
     * Calculates Reciprocal Rank (RR).
     * RR = 1 / rank of first relevant item (1-indexed), or 0.0 if not found in top-K.
     */
    public static <T> double calculateReciprocalRank(List<T> retrieved, Collection<T> groundTruth, int k) {
        if (retrieved == null || retrieved.isEmpty() || groundTruth == null || groundTruth.isEmpty() || k <= 0) {
            return 0.0;
        }

        Set<T> truthSet = new HashSet<>(groundTruth);
        int limit = Math.min(k, retrieved.size());

        for (int rank = 1; rank <= limit; rank++) {
            T item = retrieved.get(rank - 1);
            if (truthSet.contains(item)) {
                return 1.0 / rank;
            }
        }
        return 0.0;
    }

    /**
     * Calculates Normalized Discounted Cumulative Gain at rank K (NDCG@K) with binary relevance.
     * DCG@K = sum_{i=1}^K (rel_i / log2(i + 1))
     * IDCG@K = sum_{i=1}^{min(K, |GroundTruth|)} (1 / log2(i + 1))
     * NDCG@K = DCG@K / IDCG@K
     */
    public static <T> double calculateNdcgAtK(List<T> retrieved, Collection<T> groundTruth, int k) {
        if (groundTruth == null || groundTruth.isEmpty()) {
            return 1.0;
        }
        if (retrieved == null || retrieved.isEmpty() || k <= 0) {
            return 0.0;
        }

        Set<T> truthSet = new HashSet<>(groundTruth);
        int limit = Math.min(k, retrieved.size());

        double dcg = 0.0;
        for (int i = 0; i < limit; i++) {
            T item = retrieved.get(i);
            if (truthSet.contains(item)) {
                int rank = i + 1;
                dcg += 1.0 / (Math.log(rank + 1) / Math.log(2));
            }
        }

        int idealLimit = Math.min(k, truthSet.size());
        double idcg = 0.0;
        for (int rank = 1; rank <= idealLimit; rank++) {
            idcg += 1.0 / (Math.log(rank + 1) / Math.log(2));
        }

        if (idcg == 0.0) {
            return 0.0;
        }
        return dcg / idcg;
    }
}
