package com.wealthtech.crm.modules.portfolioreview.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.wealthtech.crm.modules.portfolioreview.enums.DocumentType;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity representing an ingested and chunked mutual fund source document
 * (factsheet, SID, riskometer, expense disclosure) paired with its 1536-dimensional
 * vector embedding for candidate-constrained hybrid retrieval.
 */
@Entity
@Table(name = "fund_document_embeddings", indexes = {
    @Index(name = "idx_fund_doc_isin", columnList = "isin"),
    @Index(name = "idx_fund_doc_category", columnList = "score_category"),
    @Index(name = "idx_fund_doc_type", columnList = "document_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FundDocumentEmbedding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "isin", nullable = false, length = 12)
    private String isin;

    @Column(name = "fund_name", nullable = false)
    private String fundName;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 32)
    private DocumentType documentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "score_category", nullable = false, length = 32)
    private ScoreCategory category;

    @Column(name = "asset_class", length = 64)
    private String assetClass;

    @Column(name = "chunk_index", nullable = false)
    private Integer chunkIndex;

    @Column(name = "chunk_text", nullable = false, columnDefinition = "TEXT")
    private String chunkText;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;

    @JdbcTypeCode(SqlTypes.VECTOR)
    @Column(name = "embedding", columnDefinition = "vector")
    private float[] embedding;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
