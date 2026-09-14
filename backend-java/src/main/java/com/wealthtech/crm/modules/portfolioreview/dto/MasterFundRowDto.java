package com.wealthtech.crm.modules.portfolioreview.dto;

import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;

public record MasterFundRowDto(
        String fundName,
        String isin,
        ScoreCategory scoreCategory,
        String fundSubCategory,
        String assetClass,
        String instrumentType,
        Boolean isActive
) {}
