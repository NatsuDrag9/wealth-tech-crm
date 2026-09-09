package com.wealthtech.crm.modules.riskappetite.dto;

import java.util.List;

public record RaQuestionResponse(
                Long id,
                String questionText,
                String rationale,
                Integer order,
                List<RaOptionResponse> options) {
}
