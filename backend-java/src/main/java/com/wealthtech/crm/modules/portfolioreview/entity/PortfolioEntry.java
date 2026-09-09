package com.wealthtech.crm.modules.portfolioreview.entity;

import java.math.BigDecimal;

import com.wealthtech.crm.modules.portfolioreview.enums.EntryAction;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "portfolio_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder 
public class PortfolioEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_review_id", nullable = false)
    private PortfolioReview portfolioReview;

    @Column(name = "fund_name", nullable = false)
    private String fundName;

    @Column(name = "isin")
    private String isin;

    @Column(name = "units")
    private BigDecimal units;

    @Column(name = "purchase_nav")
    private BigDecimal purchaseNav;

    @Column(name = "current_nav")
    private BigDecimal currentNav;

    @Column(name = "invested_amount")
    private BigDecimal investedAmount;

    @Column(name = "current_value")
    private BigDecimal currentValue;

    @Column(name = "gain")
    private BigDecimal gain;

    @Column(name = "abs_return_pct")
    private Double absReturnPct;

    @Column(name = "cagr_pct")
    private Double cagrPct;

    @Column(name = "holding_days")
    private Integer holdingDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false)
    @Builder.Default
    private EntryAction action = EntryAction.HOLD;
}
