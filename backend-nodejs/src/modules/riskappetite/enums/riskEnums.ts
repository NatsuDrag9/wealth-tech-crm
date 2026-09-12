export enum AssessmentStatus {
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = 'COMPLETED'
}

export enum ScoreCategoryCode {
    VERY_CONSERVATIVE = 'very_conservative',
    CONSERVATIVE = 'conservative',
    MODERATE = 'moderate',
    AGGRESSIVE = 'aggressive',
    VERY_AGGRESSIVE = 'very_aggressive',
}

export interface IScoreCategoryInfo {
    code: ScoreCategoryCode;
    displayName: string;
    minScore: number;
    maxScore: number;
}

export const SCORE_CATEGORIES: Record<ScoreCategoryCode, IScoreCategoryInfo> = {
    [ScoreCategoryCode.VERY_CONSERVATIVE]: {
        code: ScoreCategoryCode.VERY_CONSERVATIVE,
        displayName: 'Very Conservative',
        minScore: 14,
        maxScore: 28,
    },
    [ScoreCategoryCode.CONSERVATIVE]: {
        code: ScoreCategoryCode.CONSERVATIVE,
        displayName: 'Conservative',
        minScore: 29,
        maxScore: 42,
    },
    [ScoreCategoryCode.MODERATE]: {
        code: ScoreCategoryCode.MODERATE,
        displayName: 'Moderate',
        minScore: 43,
        maxScore: 56,
    },
    [ScoreCategoryCode.AGGRESSIVE]: {
        code: ScoreCategoryCode.AGGRESSIVE,
        displayName: 'Aggressive',
        minScore: 57,
        maxScore: 63,
    },
    [ScoreCategoryCode.VERY_AGGRESSIVE]: {
        code: ScoreCategoryCode.VERY_AGGRESSIVE,
        displayName: 'Very Aggressive',
        minScore: 64,
        maxScore: 70,
    },
};

/**                                                                                                   
 * Pure function: Computes the regulatory risk profile category based on accumulated assessment points.
 */
export function getScoreCategoryFromScore(score: number): IScoreCategoryInfo {
    for (const category of Object.values(SCORE_CATEGORIES)) {
        if (score >= category.minScore && score <= category.maxScore) {
            return category;
        }
    }

    return score < 14
        ? SCORE_CATEGORIES[ScoreCategoryCode.VERY_CONSERVATIVE]
        : SCORE_CATEGORIES[ScoreCategoryCode.VERY_AGGRESSIVE];
}    