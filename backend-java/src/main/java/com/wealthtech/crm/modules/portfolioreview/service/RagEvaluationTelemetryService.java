package com.wealthtech.crm.modules.portfolioreview.service;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.stereotype.Service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for collecting, recording, and publishing RAG pipeline evaluation metrics to Micrometer,
 * which are subsequently scraped by Prometheus (/actuator/prometheus) and visualized in Grafana.
 */
@Service
@Slf4j
public class RagEvaluationTelemetryService {

    private final MeterRegistry meterRegistry;

    // Gauges for latest benchmark / evaluation scores
    private final AtomicReference<Double> latestFaithfulnessScore = new AtomicReference<>(1.0);
    private final AtomicReference<Double> latestRelevancyScore = new AtomicReference<>(1.0);
    private final AtomicReference<Double> latestIrRecallAtK = new AtomicReference<>(1.0);
    private final AtomicReference<Double> latestIrNdcgAtK = new AtomicReference<>(1.0);
    private final AtomicReference<Double> latestIrMrr = new AtomicReference<>(1.0);

    // Distribution summaries for continuous scoring distributions
    private final DistributionSummary faithfulnessSummary;
    private final DistributionSummary relevancySummary;

    public RagEvaluationTelemetryService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        // Register Prometheus Gauges
        Gauge.builder("rag.eval.faithfulness.score", latestFaithfulnessScore, AtomicReference::get)
                .description("Latest grounded faithfulness evaluation score (0.0 - 1.0) assessing factual accuracy against context")
                .register(meterRegistry);

        Gauge.builder("rag.eval.relevancy.score", latestRelevancyScore, AtomicReference::get)
                .description("Latest answer relevancy evaluation score (0.0 - 1.0) assessing semantic alignment to user query")
                .register(meterRegistry);

        Gauge.builder("rag.eval.ir.recall", latestIrRecallAtK, AtomicReference::get)
                .tag("k", "5")
                .description("Latest IR Candidate-Grounded Recall@K metric across benchmark evaluation")
                .register(meterRegistry);

        Gauge.builder("rag.eval.ir.ndcg", latestIrNdcgAtK, AtomicReference::get)
                .tag("k", "5")
                .description("Latest IR Normalized Discounted Cumulative Gain (NDCG@K) metric across benchmark evaluation")
                .register(meterRegistry);

        Gauge.builder("rag.eval.ir.mrr", latestIrMrr, AtomicReference::get)
                .description("Latest IR Mean Reciprocal Rank (MRR) metric across benchmark evaluation")
                .register(meterRegistry);

        this.faithfulnessSummary = DistributionSummary.builder("rag.eval.faithfulness.distribution")
                .description("Distribution of fact-checking faithfulness scores across evaluations")
                .minimumExpectedValue(0.01)
                .maximumExpectedValue(1.0)
                .register(meterRegistry);

        this.relevancySummary = DistributionSummary.builder("rag.eval.relevancy.distribution")
                .description("Distribution of semantic answer relevancy scores across evaluations")
                .minimumExpectedValue(0.01)
                .maximumExpectedValue(1.0)
                .register(meterRegistry);

        log.info("RagEvaluationTelemetryService initialized with Micrometer gauges and distribution summaries.");
    }

    public void recordFaithfulness(double score, boolean pass, String judgeType, long durationMs) {
        latestFaithfulnessScore.set(score);
        faithfulnessSummary.record(score);

        Counter.builder("rag.eval.runs.total")
                .tag("evaluator", "fact_checking")
                .tag("judge_type", judgeType != null ? judgeType.toLowerCase() : "unknown")
                .tag("verdict", pass ? "pass" : "fail")
                .description("Total number of RAG evaluation runs")
                .register(meterRegistry)
                .increment();

        Timer.builder("rag.eval.duration.seconds")
                .tag("evaluator", "fact_checking")
                .description("Latency of RAG evaluation execution")
                .register(meterRegistry)
                .record(Duration.ofMillis(durationMs));
    }

    public void recordRelevancy(double score, boolean pass, String judgeType, long durationMs) {
        latestRelevancyScore.set(score);
        relevancySummary.record(score);

        Counter.builder("rag.eval.runs.total")
                .tag("evaluator", "relevancy")
                .tag("judge_type", judgeType != null ? judgeType.toLowerCase() : "unknown")
                .tag("verdict", pass ? "pass" : "fail")
                .description("Total number of RAG evaluation runs")
                .register(meterRegistry)
                .increment();

        Timer.builder("rag.eval.duration.seconds")
                .tag("evaluator", "relevancy")
                .description("Latency of RAG evaluation execution")
                .register(meterRegistry)
                .record(Duration.ofMillis(durationMs));
    }

    public void recordIrBenchmark(double recallAtK, double ndcgAtK, double mrr, int topK, boolean pass, long durationMs) {
        latestIrRecallAtK.set(recallAtK);
        latestIrNdcgAtK.set(ndcgAtK);
        latestIrMrr.set(mrr);

        Counter.builder("rag.eval.runs.total")
                .tag("evaluator", "ir_benchmark")
                .tag("judge_type", "deterministic_ground_truth")
                .tag("verdict", pass ? "pass" : "fail")
                .description("Total number of RAG evaluation runs")
                .register(meterRegistry)
                .increment();

        Timer.builder("rag.eval.duration.seconds")
                .tag("evaluator", "ir_benchmark")
                .description("Latency of RAG evaluation execution")
                .register(meterRegistry)
                .record(Duration.ofMillis(durationMs));
    }

    public double getLatestFaithfulnessScore() {
        return latestFaithfulnessScore.get();
    }

    public double getLatestRelevancyScore() {
        return latestRelevancyScore.get();
    }

    public double getLatestIrRecallAtK() {
        return latestIrRecallAtK.get();
    }

    public double getLatestIrNdcgAtK() {
        return latestIrNdcgAtK.get();
    }

    public double getLatestIrMrr() {
        return latestIrMrr.get();
    }
}
