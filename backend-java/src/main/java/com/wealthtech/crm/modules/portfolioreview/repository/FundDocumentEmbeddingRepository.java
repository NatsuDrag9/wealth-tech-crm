package com.wealthtech.crm.modules.portfolioreview.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.portfolioreview.dto.FundDocumentEvidenceProjection;
import com.wealthtech.crm.modules.portfolioreview.entity.FundDocumentEmbedding;
import com.wealthtech.crm.modules.portfolioreview.enums.DocumentType;

/**
 * Repository interface for managing mutual fund document embeddings and executing
 * candidate-constrained hybrid retrieval queries (pgvector semantic distance + full-text lexical ranking).
 */
@Repository
public interface FundDocumentEmbeddingRepository extends JpaRepository<FundDocumentEmbedding, Long> {

    List<FundDocumentEmbedding> findByIsin(String isin);

    List<FundDocumentEmbedding> findByIsinAndDocumentType(String isin, DocumentType documentType);

    void deleteByIsin(String isin);

    /**
     * Executes candidate-constrained PostgreSQL tri-factor hybrid retrieval:
     * 1. Hard relational pre-filter on approved candidate ISINs (:candidateIsins) via B-Tree index.
     * 2. Semantic vector cosine similarity via pgvector HNSW index (weight 0.70).
     * 3. Lexical keyword matching via PostgreSQL tsvector/ts_rank_cd GIN index (weight 0.30).
     * 4. SQL-level Top-K cutoff enforced by LIMIT :limit.
     *
     * @param candidateIsins whitelisted candidate ISINs matching client risk appetite
     * @param queryEmbedding string representation of query embedding vector e.g. "[0.012, -0.045, ...]"
     * @param queryText raw search text for full-text lexical ranking
     * @param limit Top-K cutoff limit
     * @return Top-K ranked document chunks with hybrid relevance score
     */
    @Query(value = """
        SELECT 
            f.id AS id,
            f.isin AS isin,
            f.fund_name AS fundName,
            f.document_type AS documentType,
            f.score_category AS scoreCategory,
            f.asset_class AS assetClass,
            f.chunk_index AS chunkIndex,
            f.chunk_text AS chunkText,
            f.metadata AS metadata,
            f.created_at AS createdAt,
            (
                0.7 * (1.0 - (f.embedding <=> CAST(:queryEmbedding AS vector))) +
                0.3 * ts_rank_cd(to_tsvector('english', f.chunk_text), plainto_tsquery('english', :queryText))
            ) AS hybridScore
        FROM fund_document_embeddings f
        WHERE f.isin IN (:candidateIsins)
        ORDER BY hybridScore DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<FundDocumentEvidenceProjection> findTopKRelevantEvidence(
            @Param("candidateIsins") Collection<String> candidateIsins,
            @Param("queryEmbedding") String queryEmbedding,
            @Param("queryText") String queryText,
            @Param("limit") int limit);
}
