package com.wealthtech.crm.modules.portfolioreview.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.wealthtech.crm.modules.portfolioreview.enums.RecommendationFlowType;
import com.wealthtech.crm.modules.portfolioreview.enums.RecommendationStatus;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "portfolio_recommendations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioRecommendation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_review_id", nullable = true)
    private PortfolioReview portfolioReview;

    @Enumerated(EnumType.STRING)
    @Column(name = "flow_type", nullable = false)
    private RecommendationFlowType flowType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private RecommendationStatus status = RecommendationStatus.SAVED;

    @Enumerated(EnumType.STRING)
    @Column(name = "investor_category")
    private ScoreCategory investorCategory;

    @Column(name = "generated_document_url")
    private String generatedDocumentUrl;

    @Column(name = "document_s3_key")
    private String documentS3Key;

    @OneToMany(mappedBy = "recommendation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RecommendationFundItem> funds = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
