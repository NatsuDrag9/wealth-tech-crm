package com.wealthtech.crm.modules.riskappetite.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "risk_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_text", nullable = false, length = 1000)
    private String questionText;

    @Column(length = 1000)
    private String rationale;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("optionLetter ASC")
    @Builder.Default
    private List<RiskOption> options = new ArrayList<>();

}