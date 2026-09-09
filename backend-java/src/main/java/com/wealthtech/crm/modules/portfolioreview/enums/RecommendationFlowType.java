package com.wealthtech.crm.modules.portfolioreview.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RecommendationFlowType {
    REPLACE_FUNDS("Replace Funds"),
    NEW_PORTFOLIO("New Portfolio");

    private final String displayName;
}
