package com.wealthtech.crm.modules.riskappetite.dto;

public record RaOptionResponse(
        Long id,
        String optionLetter,
        String optionText,
        Integer points) {
}
