export enum ReviewStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}

export enum EntryAction {
    HOLD = "HOLD",
    SELL = "SELL"
}

export enum RecommendationFlowType {
    REPLACE_FUNDS = "REPLACE_FUNDS",
    NEW_PORTFOLIO = "NEW_PORTFOLIO"
}

export const FLOW_TYPE_DISPLAY_NAMES: Record<RecommendationFlowType, string> = {
    [RecommendationFlowType.REPLACE_FUNDS]: "Replace Funds",
    [RecommendationFlowType.NEW_PORTFOLIO]: "New Portfolio"
}

export enum RecommendationStatus {
    SAVED = "SAVED",
    PDF_GENERATED = "PDF_GENERATED",
    PDF_FAILED = "PDF_FAILED"
}

