package com.wealthtech.crm.modules.riskappetite.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "risk_options")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private RiskQuestion question;

    @Column(name = "option_letter")
    private String optionLetter; // eg "A", "B", "C", "D"

    @Column(name = "option_text", nullable = false, length = 1000)
    private String optionText;

    @Column(nullable = false)
    private Integer points; // 1, 2, 3, 4, 5, null (no points exist yet)
}
