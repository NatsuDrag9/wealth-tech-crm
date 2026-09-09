package com.wealthtech.crm.modules.riskappetite.dto;

import java.time.LocalDateTime;

public record RaAnswerResponse(
        Long id,
        Long questionId,
        Long optionId,
        LocalDateTime createdAt) {

}
