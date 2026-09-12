import { Types } from "mongoose";
import { AppError } from "../../../common/utils/AppError";
import { logger } from "../../../common/utils/logger";
import { AssessmentStatus, ScoreCategoryCode } from "../../riskappetite/enums/riskEnums";
import { CreateRecommendationDto, EligibleFundResponseDto, FlowTypeResponseDto, PortfolioEntryResponseDto, PortfolioRecommendationResponseDto, PortfolioReviewResponseDto, RfItemResponseDto } from "../dto/portfolioDto";
import { EntryAction, FLOW_TYPE_DISPLAY_NAMES, RecommendationFlowType, RecommendationStatus, ReviewStatus } from "../enums/portfolioEnums";
import { EligibleFund, IEligibleFund } from "../models/EligibleFund";
import { IPortfolioRecommendation, PortfolioRecommendation } from "../models/PortfolioRecommendation";
import { IPortfolioEntry, IPortfolioReview, PortfolioReview } from "../models/PortfolioReview";
import { Client } from "../../customer/models/Client";
import { RiskAssessment } from "../../riskappetite/models/RiskAssessment";
import { portfolioPdfService } from "./portfolioPdfService";

export class PortfolioReviewService {
    // Mappers                                                     

    private mapToFundResponse(ef: IEligibleFund): EligibleFundResponseDto {
        return {
            id: ef._id.toString(),
            fundName: ef.fundName,
            isin: ef.isin,
            fundSubCategory: ef.fundSubCategory,
            assetClass: ef.assetClass,
            instrumentType: ef.instrumentType,
            scoreCategory: ef.scoreCategory || null,
        };
    }

    private mapToEntryResponse(pe: IPortfolioEntry): PortfolioEntryResponseDto {
        return {
            id: pe._id.toString(),
            fundName: pe.fundName,
            isin: pe.isin,
            units: pe.units,
            purchaseNav: pe.purchaseNav,
            currentNav: pe.currentNav,
            investedAmount: pe.investedAmount,
            currentValue: pe.currentValue,
            absReturnPct: pe.absReturnPct,
            gain: pe.gain,
            cagrPct: pe.cagrPct,
            holdingDays: pe.holdingDays,
            action: pe.action,
        };
    }

    private mapToReviewResponse(pr: IPortfolioReview): PortfolioReviewResponseDto {
        return {
            id: pr._id.toString(),
            clientId: pr.client.toString(),
            status: pr.status,
            totalInvested: pr.totalInvested,
            totalCurrentValue: pr.totalCurrentValue,
            totalGain: pr.totalGain,
            gainPercentage: pr.gainPercentage,
            cagr: pr.cagr,
            note: pr.note || null,
            entries: pr.entries.map((e) => this.mapToEntryResponse(e)),
            createdAt: pr.createdAt,
        };
    }

    private mapToRecommendationResponse(pr: IPortfolioRecommendation):
        PortfolioRecommendationResponseDto {
        const funds: RfItemResponseDto[] = pr.funds.map((item, index) => {
            const fund = item.eligibleFund as IEligibleFund;
            return {
                id: item._id ? item._id.toString() : String(index + 1),
                eligibleFund: this.mapToFundResponse(fund),
                amount: item.amount,
                replacesEntryId: item.replacesEntryId ? item.replacesEntryId.toString() : null,
                displayOrder: item.displayOrder,
            };
        });

        return {
            id: pr._id.toString(),
            clientId: pr.client.toString(),
            portfolioReviewId: pr.portfolioReview ? pr.portfolioReview.toString() : null,
            flowType: pr.flowType,
            status: pr.status,
            investorCategory: pr.investorCategory || null,
            generatedDocumentUrl: pr.generatedDocumentUrl || null,
            funds,
            createdAt: pr.createdAt,
        };
    }

    // Master Fund Universe 
    getFlowTypes(): FlowTypeResponseDto[] {
        return Object.values(RecommendationFlowType).map((flowType) => ({
            code: flowType,
            displayName: FLOW_TYPE_DISPLAY_NAMES[flowType]
        }));
    }

    async getEligibleFunds(categoryCode?: string): Promise<EligibleFundResponseDto[]> {
        const filter: Record<string, unknown> = { isActive: true };

        if (categoryCode && Object.values(ScoreCategoryCode).includes(categoryCode as ScoreCategoryCode)) {
            filter.scoreCategory = categoryCode;
        }

        const funds = await EligibleFund.find(filter).sort({ fundName: 1 });
        return funds.map((f) => this.mapToFundResponse(f));
    }

    // Portfolio Reviews and Holdings
    async getReview(reviewId: string): Promise<PortfolioReviewResponseDto> {
        const review = await PortfolioReview.findById(reviewId);
        if (!review) {
            logger.warn({ reviewId }, "Get review failed: Portfolio review not found");
            throw new AppError(`Portfolio review not found with id: ${reviewId}`, 404);
        }
        return this.mapToReviewResponse(review);
    }

    async getLatestReview(clientId: string): Promise<PortfolioReviewResponseDto> {
        const review = await PortfolioReview.findOne({
            client: new Types.ObjectId(clientId)
        }).sort({ createdAt: -1 });

        if (!review) {
            logger.warn({ clientId }, 'Get latest review failed: No review found for client');
            throw new AppError(`No portfolio review found for client: ${clientId}`, 404);
        }

        return this.mapToReviewResponse(review);
    }

    async getReviewHistory(clientId: string): Promise<PortfolioReviewResponseDto[]> {
        const reviews = await PortfolioReview.find({
            client: new Types.ObjectId(clientId),
        }).sort({ createdAt: -1 });

        return reviews.map((r) => this.mapToReviewResponse(r));
    }

    /**
     * Creates a realistic eCAS portfolio review session for testing
     * Contains 4 holdings: 2 marked HOLD, 2 marked SELL
     */
    async createSampleReview(clientId: string): Promise<PortfolioReviewResponseDto> {
        const client = await Client.findById(clientId);
        if (!client) {
            logger.warn({ clientId }, 'Create sample review failed: Client not found');
            throw new AppError('Client not found', 404);
        }

        const sampleEntries: IPortfolioEntry[] = [
            {
                _id: new Types.ObjectId(),
                fundName: 'HDFC Top 100 Fund',
                isin: 'INF179K01BE2',
                units: 1000.0,
                purchaseNav: 500.0,
                currentNav: 650.0,
                investedAmount: 500000.0,
                currentValue: 650000.0,
                gain: 150000.0,
                absReturnPct: 30.0,
                cagrPct: 14.5,
                holdingDays: 730,
                action: EntryAction.HOLD,
            },
            {
                _id: new Types.ObjectId(),
                fundName: 'Axis Bluechip Fund',
                isin: 'INF846K01164',
                units: 800.0,
                purchaseNav: 40.0,
                currentNav: 48.0,
                investedAmount: 32000.0,
                currentValue: 38400.0,
                gain: 6400.0,
                absReturnPct: 20.0,
                cagrPct: 12.0,
                holdingDays: 600,
                action: EntryAction.HOLD,
            },
            {
                _id: new Types.ObjectId(),
                fundName: 'Underperforming Infra Fund',
                isin: 'INF200K01INF',
                units: 500.0,
                purchaseNav: 100.0,
                currentNav: 90.0,
                investedAmount: 50000.0,
                currentValue: 45000.0,
                gain: -5000.0,
                absReturnPct: -10.0,
                cagrPct: -4.5,
                holdingDays: 800,
                action: EntryAction.SELL,
            },
            {
                _id: new Types.ObjectId(),
                fundName: 'High Expense Small Cap Fund',
                isin: 'INF109K01SMC',
                units: 400.0,
                purchaseNav: 120.0,
                currentNav: 125.0,
                investedAmount: 48000.0,
                currentValue: 50000.0,
                gain: 2000.0,
                absReturnPct: 4.16,
                cagrPct: 1.8,
                holdingDays: 850,
                action: EntryAction.SELL,
            },
        ];

        const review = await PortfolioReview.create({
            client: new Types.ObjectId(clientId),
            status: ReviewStatus.COMPLETED,
            totalInvested: 630000.0,
            totalCurrentValue: 783400.0,
            totalGain: 153400.0,
            gainPercentage: 24.35,
            cagr: 12.5,
            note: 'Sample eCAS upload parsed successfully',
            entries: sampleEntries,
        });

        logger.info({ reviewId: review._id, clientId }, 'Sample portfolio review session created');
        return this.mapToReviewResponse(review);
    }

    // Recommendations and Compliance Check
    async createRecommendation(request: CreateRecommendationDto): Promise<PortfolioRecommendationResponseDto> {
        // Mandatory compliance check - Client must have a completed risk assessment
        const latestAssessment = await RiskAssessment.findOne({
            client: new Types.ObjectId(request.clientId),
            status: AssessmentStatus.COMPLETED,
        }).sort({ completedAt: -1, createdAt: -1 });

        if (!latestAssessment) {
            logger.warn(
                { clientId: request.clientId },
                'Recommendation creation blocked: Client must complete a risk assessment first'
            );
            throw new AppError(
                `Client ${request.clientId} must complete a risk assessment before receiving recommendations`,
                400
            );
        }

        // Validate Strategy Flow
        let review: IPortfolioReview | null = null;
        if (request.flowType === RecommendationFlowType.REPLACE_FUNDS) {
            if (!request.portfolioReviewId) {
                logger.warn({ request }, 'Create recommendation failed: Missing portfolioReviewId for REPLACE_FUNDS');
                throw new AppError('portfolioReviewId is required for REPLACE_FUNDS flow', 400);
            }

            review = await PortfolioReview.findById(request.portfolioReviewId);
            if (!review) {
                logger.warn({ reviewId: request.portfolioReviewId }, 'Create recommendation failed: Review not found');
                throw new AppError(`Portfolio review not found: ${request.portfolioReviewId}`, 404);
            }

            if (review.client.toString() !== request.clientId) {
                logger.warn({ reviewClient: review.client, requestClient: request.clientId }, 'Review does not belong to client');
                throw new AppError(`Review does not belong to client: ${request.clientId}`, 400);
            }

            // Validate that every replaced entry exists and has action === SELL
            for (const item of request.funds) {
                if (item.replacesEntryId) {
                    const entry = review.entries.find((e) => e._id.toString() === item.replacesEntryId);
                    if (!entry) {
                        logger.warn({ entryId: item.replacesEntryId }, 'Replaced entry not found in review');
                        throw new AppError(`Holding ${item.replacesEntryId} does not belong to review ${review._id}`, 404);
                    }
                    if (entry.action !== EntryAction.SELL) {
                        logger.warn({ entryId: item.replacesEntryId, action: entry.action }, 'Holding is not marked SELL');
                        throw new AppError(
                            `Holding ${item.replacesEntryId} is marked ${entry.action} - only SELL holdings can be replaced`,
                            400
                        );
                    }
                }
            }
        }
        else if (request.flowType === RecommendationFlowType.NEW_PORTFOLIO) {
            for (const item of request.funds) {
                if (item.replacesEntryId) {
                    logger.warn({ item }, 'replacesEntryId provided for NEW_PORTFOLIO');
                    throw new AppError('replacesEntryId cannot be provided for NEW_PORTFOLIO flow', 400);
                }
            }
        }

        // Verify all eligible funds exist
        const fundItems = [];
        let order = 1;
        for (const item of request.funds) {
            const fund = await EligibleFund.findById(item.eligibleFundId);
            if (!fund) {
                logger.warn({ eligibleFundId: item.eligibleFundId }, 'Eligible fund not found');
                throw new AppError(`Eligible fund not found: ${item.eligibleFundId}`, 404);
            }

            fundItems.push({
                eligibleFund: fund._id,
                amount: item.amount,
                replacesEntryId: item.replacesEntryId ? new Types.ObjectId(item.replacesEntryId) : null,
                displayOrder: item.displayOrder || order++,
            });
        }

        // Create and save recommendation
        const recommendation = await PortfolioRecommendation.create({
            client: new Types.ObjectId(request.clientId),
            portfolioReview: review ? review._id : null,
            flowType: request.flowType,
            status: RecommendationStatus.SAVED,
            investorCategory: latestAssessment.scoreCategory?.code || null,
            funds: fundItems,
        });

        const populated = await PortfolioRecommendation.findById(recommendation._id).populate('funds.eligibleFund');

        logger.info({ recommendationId: recommendation._id, clientId: request.clientId }, 'Recommendation created');
        return this.mapToRecommendationResponse(populated || recommendation);
    }

    async getRecommendation(id: string): Promise<PortfolioRecommendationResponseDto> {
        const recommendation = await PortfolioRecommendation.findById(id).populate('funds.eligibleFund');
        if (!recommendation) {
            logger.warn({ id }, 'Get recommendation failed: Not found');
            throw new AppError(`Portfolio recommendation not found with id: ${id}`, 404);
        }
        return this.mapToRecommendationResponse(recommendation);
    }

    async getRecommendationsByClient(clientId: string): Promise<PortfolioRecommendationResponseDto[]> {
        const recommendations = await PortfolioRecommendation.find({
            client: new Types.ObjectId(clientId),
        })
            .populate('funds.eligibleFund')
            .sort({ createdAt: -1 });

        return recommendations.map((rec) => this.mapToRecommendationResponse(rec));
    }

    /**
     * Triggers non-blocking background PDF generation and returns current state (HTTP 202).
     */
    async triggerPdfGeneration(recommendationId: string): Promise<PortfolioRecommendationResponseDto> {
        const recommendation = await PortfolioRecommendation.findById(recommendationId).populate(
            'funds.eligibleFund'
        );

        if (!recommendation) {
            logger.warn({ recommendationId }, 'Trigger PDF generation failed: Not found');
            throw new AppError(`Portfolio recommendation not found: ${recommendationId}`, 404);
        }

        if (
            recommendation.status === RecommendationStatus.PDF_GENERATED &&
            recommendation.generatedDocumentUrl
        ) {
            return this.mapToRecommendationResponse(recommendation);
        }

        // Fire and forget non-blocking background PDF generation
        this.generatePdfAsync(recommendationId).catch((err) => {
            logger.error({ err, recommendationId }, 'Background PDF generation encountered an error');
        });

        return this.mapToRecommendationResponse(recommendation);
    }

    /**
     * Non-blocking background worker for PDF compilation.
     */
    async generatePdfAsync(recommendationId: string): Promise<void> {
        try {
            const rec = await PortfolioRecommendation.findById(recommendationId).populate('funds.eligibleFund');
            if (!rec) return;

            if (rec.status === RecommendationStatus.PDF_GENERATED && rec.generatedDocumentUrl) {
                return;
            }

            const documentUrl = await portfolioPdfService.generateRecommendationPdf(rec);

            rec.status = RecommendationStatus.PDF_GENERATED;
            rec.generatedDocumentUrl = documentUrl;
            await rec.save();

            logger.info({ recommendationId, documentUrl }, 'Background PDF compilation completed');
        } catch (ex) {
            logger.error({ ex, recommendationId }, 'Background PDF compilation failed');
            await PortfolioRecommendation.findByIdAndUpdate(recommendationId, {
                status: RecommendationStatus.PDF_FAILED,
            });
        }
    }
}

export const portfolioReviewService = new PortfolioReviewService();