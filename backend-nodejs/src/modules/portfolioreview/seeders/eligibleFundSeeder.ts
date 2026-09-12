import { EligibleFund } from '../models/EligibleFund';
import { ScoreCategoryCode } from '../../riskappetite/enums/riskEnums';
import { logger } from '../../../common/utils/logger';

interface EligibleFundSeedData {
  fundName: string;
  isin: string;
  fundSubCategory: string;
  assetClass: string;
  instrumentType: string;
  scoreCategory: ScoreCategoryCode;
  isActive: boolean;
}

const ELIGIBLE_FUNDS_DATA: EligibleFundSeedData[] = [
  // 1. Very Conservative (Liquid, Overnight, Ultra Short Duration Debt)
  {
    fundName: 'HDFC Liquid Fund - Direct Plan - Growth',
    isin: 'INF179K01LQ5',
    fundSubCategory: 'Liquid',
    assetClass: 'Debt',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.VERY_CONSERVATIVE,
    isActive: true,
  },
  {
    fundName: 'ICICI Prudential Ultra Short Term Fund - Direct Plan - Growth',
    isin: 'INF109K01US8',
    fundSubCategory: 'Ultra Short Duration',
    assetClass: 'Debt',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.VERY_CONSERVATIVE,
    isActive: true,
  },
  {
    fundName: 'SBI Overnight Fund - Direct Plan - Growth',
    isin: 'INF200K01ON7',
    fundSubCategory: 'Overnight',
    assetClass: 'Debt',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.VERY_CONSERVATIVE,
    isActive: true,
  },

  // 2. Conservative (Conservative Hybrid, Banking & PSU, Corporate Bond)
  {
    fundName: 'SBI Conservative Hybrid Fund - Direct Plan - Growth',
    isin: 'INF200K01CH3',
    fundSubCategory: 'Conservative Hybrid',
    assetClass: 'Hybrid',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.CONSERVATIVE,
    isActive: true,
  },
  {
    fundName: 'Kotak Banking & PSU Debt Fund - Direct Plan - Growth',
    isin: 'INF174K01BP6',
    fundSubCategory: 'Banking & PSU',
    assetClass: 'Debt',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.CONSERVATIVE,
    isActive: true,
  },
  {
    fundName: 'ICICI Prudential Corporate Bond Fund - Direct Plan - Growth',
    isin: 'INF109K01CB1',
    fundSubCategory: 'Corporate Bond',
    assetClass: 'Debt',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.CONSERVATIVE,
    isActive: true,
  },

  // 3. Moderate (Balanced Advantage, Dynamic Asset Allocation, Large Cap)
  {
    fundName: 'HDFC Balanced Advantage Fund - Direct Plan - Growth',
    isin: 'INF179K01BA9',
    fundSubCategory: 'Dynamic Asset Allocation',
    assetClass: 'Hybrid',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.MODERATE,
    isActive: true,
  },
  {
    fundName: 'ICICI Prudential Multi-Asset Fund - Direct Plan - Growth',
    isin: 'INF109K01MA4',
    fundSubCategory: 'Multi Asset Allocation',
    assetClass: 'Hybrid',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.MODERATE,
    isActive: true,
  },
  {
    fundName: 'Mirae Asset Large Cap Fund - Direct Plan - Growth',
    isin: 'INF769K01LC2',
    fundSubCategory: 'Large Cap',
    assetClass: 'Equity',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.MODERATE,
    isActive: true,
  },

  // 4. Aggressive (Flexi Cap, Large & Mid Cap, Mid Cap)
  {
    fundName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    isin: 'INF879O01018',
    fundSubCategory: 'Flexi Cap',
    assetClass: 'Equity',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.AGGRESSIVE,
    isActive: true,
  },
  {
    fundName: 'Nippon India Large Cap Fund - Direct Plan - Growth',
    isin: 'INF204K01LC5',
    fundSubCategory: 'Large Cap',
    assetClass: 'Equity',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.AGGRESSIVE,
    isActive: true,
  },
  {
    fundName: 'Kotak Emerging Equity Fund - Direct Plan - Growth',
    isin: 'INF174K01EE7',
    fundSubCategory: 'Mid Cap',
    assetClass: 'Equity',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.AGGRESSIVE,
    isActive: true,
  },

  // 5. Very Aggressive (Small Cap, Sectoral/Thematic)
  {
    fundName: 'Axis Small Cap Fund - Direct Plan - Growth',
    isin: 'INF846K01SC1',
    fundSubCategory: 'Small Cap',
    assetClass: 'Equity',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.VERY_AGGRESSIVE,
    isActive: true,
  },
  {
    fundName: 'Nippon India Small Cap Fund - Direct Plan - Growth',
    isin: 'INF204K01SC8',
    fundSubCategory: 'Small Cap',
    assetClass: 'Equity',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.VERY_AGGRESSIVE,
    isActive: true,
  },
  {
    fundName: 'Tata Digital India Fund - Direct Plan - Growth',
    isin: 'INF277K01DI3',
    fundSubCategory: 'Sectoral/Thematic',
    assetClass: 'Equity',
    instrumentType: 'Mutual Fund',
    scoreCategory: ScoreCategoryCode.VERY_AGGRESSIVE,
    isActive: true,
  },
];

export const seedEligibleFunds = async (): Promise<void> => {
  const count = await EligibleFund.countDocuments();
  if (count > 0) {
    logger.info({ count }, 'Eligible funds already seeded. Skipping seeder.');
    return;
  }

  logger.info('Seeding curated master eligible funds across all 5 risk tiers...');
  await EligibleFund.insertMany(ELIGIBLE_FUNDS_DATA);
  logger.info({ count: ELIGIBLE_FUNDS_DATA.length }, 'Eligible funds seeded successfully.');
};
