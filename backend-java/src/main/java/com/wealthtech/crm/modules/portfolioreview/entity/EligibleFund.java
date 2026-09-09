package com.wealthtech.crm.modules.portfolioreview.entity;

import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "eligible_funds")
@Getter 
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EligibleFund {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fund_name", nullable = false)
    private String fundName;

    @Column(name = "isin", unique = true, nullable = false)
    private String isin;

    @Column(name = "fund_subcategory")
    private String fundSubCategory;

    @Column(name = "asset_class")
    private String assetClass;

    @Column(name = "instrument_type")
    @Builder.Default
    private String instrumentType = "Mutual Fund";

    @Enumerated(EnumType.STRING)
    @Column(name = "score_category", nullable = false)
    private ScoreCategory scoreCategory;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
