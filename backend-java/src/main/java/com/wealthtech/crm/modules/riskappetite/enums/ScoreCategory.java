package com.wealthtech.crm.modules.riskappetite.enums;

import lombok.Getter;

@Getter
public enum ScoreCategory {
    VERY_CONSERVATIVE("very_conservative", "Very Conservative", 14, 28), // 14-28 is the range for this category
    CONSERVATIVE("conservative", "Conservative", 29, 42), // 29-42 is the range
    MODERATE("moderate", "Moderate", 43, 56), // 43-56 is the range
    AGGRESSIVE("aggressive", "Aggressive", 57, 63), // 57-63 is the range
    VERY_AGGRESSIVE("very_aggressive", "Very Aggressive", 64, 70); // 64-70 is the range

    private final String code;
    private final String displayName;
    private final int minScore;
    private final int maxScore;

    ScoreCategory(String code, String displayName, int minScore, int maxScore) {
        this.code = code;
        this.displayName = displayName;
        this.minScore = minScore;
        this.maxScore = maxScore;
    }

    public static ScoreCategory fromScore(int score) {
        for (ScoreCategory category : values()) {
            if (score >= category.minScore && score <= category.maxScore) {
                return category;
            }
        }

        return score < 14 ? VERY_CONSERVATIVE : VERY_AGGRESSIVE;
    }
}
