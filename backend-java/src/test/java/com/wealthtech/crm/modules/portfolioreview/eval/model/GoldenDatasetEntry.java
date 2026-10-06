package com.wealthtech.crm.modules.portfolioreview.eval.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Representation of an individual grounded test case in the RAG Golden Dataset.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GoldenDatasetEntry {
    private String id;
    private String queryType;
    private String question;
    private List<String> candidateIsins;
    private String groundTruthAnswer;
    private List<String> groundTruthContextChunks;
    private List<Long> groundTruthChunkIds;
}
