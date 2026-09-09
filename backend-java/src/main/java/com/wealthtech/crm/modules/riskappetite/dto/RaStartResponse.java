package com.wealthtech.crm.modules.riskappetite.dto;

import java.util.List;

public record RaStartResponse(
        Long id,
        Long clientId,
        String status,
        List<RaAnswerResponse> answers) {

}
