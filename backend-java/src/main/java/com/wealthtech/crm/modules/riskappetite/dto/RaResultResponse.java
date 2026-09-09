package com.wealthtech.crm.modules.riskappetite.dto;

import java.time.LocalDateTime;

public record RaResultResponse(
        Long id,
        Long clientId,
        String status,
        Integer totalScore,
        ScoreCategoryResponse scoreCategory,
        LocalDateTime createdAt,
        LocalDateTime completedAt
) {}
