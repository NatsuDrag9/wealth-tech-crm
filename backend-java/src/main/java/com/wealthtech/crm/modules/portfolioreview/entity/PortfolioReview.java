package com.wealthtech.crm.modules.portfolioreview.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.wealthtech.crm.modules.portfolioreview.enums.ReviewStatus;

import jakarta.persistence.*;
import lombok.*;

@Entity 
@Table(name = "portfolio_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder 
public class PortfolioReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ReviewStatus status = ReviewStatus.PENDING;

    @Column(name = "total_invested")
    private BigDecimal totalInvested;

    @Column(name = "total_current_value")
    private BigDecimal totalCurrentValue;

    @Column(name = "total_gain")
    private BigDecimal totalGain;

    @Column(name = "gain_percentage")
    private Double gainPercentage;

    @Column(name = "cagr")
    private Double cagr;

    @Column(name = "note")
    private String note;

    @Column(name = "ecas_file_key")
    private String ecasFileKey;

    @OneToMany(mappedBy = "portfolioReview", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PortfolioEntry> entries = new ArrayList<>();

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
