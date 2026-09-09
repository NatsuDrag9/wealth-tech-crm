package com.wealthtech.crm.modules.riskappetite.dto;

public record ScoreCategoryResponse(
        String code,
        String displayName,
        Integer minScore,
        Integer maxScore
) {}
