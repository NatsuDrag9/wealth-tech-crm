import { RiskQuestion } from '../models/RiskQuestion';
import { logger } from '../../../common/utils/logger';

interface QuestionData {
  displayOrder: number;
  questionText: string;
  rationale: string;
  options: {
    optionLetter: string;
    optionText: string;
    points: number;
  }[];
}

const QUESTIONS_DATA: QuestionData[] = [
  {
    displayOrder: 1,
    questionText: 'What is your primary investment goal?',
    rationale: 'Assesses the primary objective: capital preservation vs. aggressive capital growth.',
    options: [
      { optionLetter: 'A', optionText: 'Capital preservation with minimum risk', points: 1 },
      { optionLetter: 'B', optionText: 'Stable income generation with moderate safety', points: 2 },
      { optionLetter: 'C', optionText: 'Balanced growth and income', points: 3 },
      { optionLetter: 'D', optionText: 'Aggressive long-term wealth appreciation', points: 5 },
    ],
  },
  {
    displayOrder: 2,
    questionText: 'What is your intended investment horizon for this portfolio?',
    rationale: 'Assesses the duration capital can remain invested without liquidation.',
    options: [
      { optionLetter: 'A', optionText: 'Less than 1 year', points: 1 },
      { optionLetter: 'B', optionText: '1 to 3 years', points: 2 },
      { optionLetter: 'C', optionText: '3 to 5 years', points: 3 },
      { optionLetter: 'D', optionText: 'More than 5 years', points: 5 },
    ],
  },
  {
    displayOrder: 3,
    questionText: 'How would you react if your portfolio dropped by 20% over a 3-month period?',
    rationale: 'Measures emotional tolerance and behavioral panic-selling risk during drawdowns.',
    options: [
      { optionLetter: 'A', optionText: 'Sell all remaining assets immediately to prevent further loss', points: 1 },
      { optionLetter: 'B', optionText: 'Move a significant portion into cash or fixed deposits', points: 2 },
      { optionLetter: 'C', optionText: 'Hold and wait for market recovery', points: 3 },
      { optionLetter: 'D', optionText: 'Buy more at discounted valuations', points: 5 },
    ],
  },
  {
    displayOrder: 4,
    questionText: 'What is your level of investment knowledge and past market experience?',
    rationale: 'Determines familiarity with asset classes and market volatility.',
    options: [
      { optionLetter: 'A', optionText: 'Novice: Only familiar with bank savings and fixed deposits', points: 1 },
      { optionLetter: 'B', optionText: 'Basic: Have invested in mutual funds occasionally', points: 2 },
      { optionLetter: 'C', optionText: 'Moderate: Familiar with equity stocks, bonds, and funds', points: 3 },
      { optionLetter: 'D', optionText: 'Advanced: Actively invest across equities, derivatives, and alternatives', points: 5 },
    ],
  },
  {
    displayOrder: 5,
    questionText: 'What percentage of your total liquid net worth are you planning to invest?',
    rationale: 'Measures capital concentration risk relative to total wealth.',
    options: [
      { optionLetter: 'A', optionText: 'More than 75% of liquid assets', points: 1 },
      { optionLetter: 'B', optionText: '50% to 75% of liquid assets', points: 2 },
      { optionLetter: 'C', optionText: '25% to 50% of liquid assets', points: 3 },
      { optionLetter: 'D', optionText: 'Less than 25% of liquid assets', points: 5 },
    ],
  },
  {
    displayOrder: 6,
    questionText: 'How secure and predictable is your current and future income stream?',
    rationale: 'Evaluates capacity to absorb potential investment shortfalls from regular income.',
    options: [
      { optionLetter: 'A', optionText: 'Highly unstable or seasonal income', points: 1 },
      { optionLetter: 'B', optionText: 'Moderately stable with occasional fluctuations', points: 2 },
      { optionLetter: 'C', optionText: 'Stable and predictable employment/business income', points: 3 },
      { optionLetter: 'D', optionText: 'Very secure with substantial multiple revenue streams', points: 5 },
    ],
  },
  {
    displayOrder: 7,
    questionText: 'Do you have an emergency fund covering at least 6 months of living expenses?',
    rationale: 'Assesses liquidity buffer to prevent premature portfolio redemptions.',
    options: [
      { optionLetter: 'A', optionText: 'No emergency fund at all', points: 1 },
      { optionLetter: 'B', optionText: 'Less than 3 months of expenses', points: 2 },
      { optionLetter: 'C', optionText: '3 to 6 months of expenses', points: 3 },
      { optionLetter: 'D', optionText: 'More than 6 months of expenses comfortably set aside', points: 5 },
    ],
  },
  {
    displayOrder: 8,
    questionText: 'Which return vs risk tradeoff describes your preference best?',
    rationale: 'Identifies investor utility curve between safety and returns.',
    options: [
      { optionLetter: 'A', optionText: 'Guaranteed 5-6% return with zero capital loss risk', points: 1 },
      { optionLetter: 'B', optionText: 'Potential 7-9% return with small, rare fluctuations', points: 2 },
      { optionLetter: 'C', optionText: 'Potential 10-14% return with moderate yearly fluctuations', points: 3 },
      { optionLetter: 'D', optionText: 'Potential 15-20%+ return with high probability of substantial short-term dips', points: 5 },
    ],
  },
  {
    displayOrder: 9,
    questionText: 'What are your debt and financial liability obligations?',
    rationale: 'Measures debt-to-income and debt service drag on overall risk capacity.',
    options: [
      { optionLetter: 'A', optionText: 'Heavy debt: Over 50% of monthly income goes toward EMIs', points: 1 },
      { optionLetter: 'B', optionText: 'Moderate debt: 25% to 50% of monthly income', points: 2 },
      { optionLetter: 'C', optionText: 'Low debt: Less than 25% of monthly income', points: 3 },
      { optionLetter: 'D', optionText: 'Zero debt and no major pending financial liabilities', points: 5 },
    ],
  },
  {
    displayOrder: 10,
    questionText: 'How do you view inflation risk compared to market risk?',
    rationale: 'Measures willingness to accept market risk to avoid purchasing power erosion.',
    options: [
      { optionLetter: 'A', optionText: 'I prefer guaranteed safety even if inflation erodes purchasing power', points: 1 },
      { optionLetter: 'B', optionText: 'I want to match inflation with minimum risk', points: 2 },
      { optionLetter: 'C', optionText: 'I want to beat inflation by a modest margin (2-4%)', points: 3 },
      { optionLetter: 'D', optionText: 'I want substantial real wealth growth well above inflation', points: 5 },
    ],
  },
  {
    displayOrder: 11,
    questionText: 'Have you ever invested in volatile assets like mid/small-caps or sector funds?',
    rationale: 'Validates past behavior under actual market volatility.',
    options: [
      { optionLetter: 'A', optionText: 'Never, and I do not intend to', points: 1 },
      { optionLetter: 'B', optionText: 'Invested once but sold due to discomfort with drops', points: 2 },
      { optionLetter: 'C', optionText: 'Currently hold small allocations in equity growth funds', points: 3 },
      { optionLetter: 'D', optionText: 'Comfortable with high-beta equities and dynamic allocation', points: 5 },
    ],
  },
  {
    displayOrder: 12,
    questionText: 'How frequently do you expect to monitor your portfolio performance?',
    rationale: 'Measures risk of behavioral over-trading and anxiety over daily noise.',
    options: [
      { optionLetter: 'A', optionText: 'Daily or multiple times a day', points: 1 },
      { optionLetter: 'B', optionText: 'Weekly', points: 2 },
      { optionLetter: 'C', optionText: 'Monthly or quarterly', points: 3 },
      { optionLetter: 'D', optionText: 'Annually, with focus strictly on long-term compounding', points: 5 },
    ],
  },
  {
    displayOrder: 13,
    questionText: 'When do you anticipate needing to make your first major withdrawal?',
    rationale: 'Assesses liquidity constraints on portfolio construction.',
    options: [
      { optionLetter: 'A', optionText: 'Within the next 6 to 12 months', points: 1 },
      { optionLetter: 'B', optionText: 'In 1 to 3 years', points: 2 },
      { optionLetter: 'C', optionText: 'In 3 to 7 years', points: 3 },
      { optionLetter: 'D', optionText: 'Not for at least 7 to 10+ years', points: 5 },
    ],
  },
  {
    displayOrder: 14,
    questionText: 'If given a choice between protecting your capital vs maximizing upside, you choose:',
    rationale: 'Final holistic calibration of risk tolerance versus risk aversion.',
    options: [
      { optionLetter: 'A', optionText: '100% Capital Protection, 0% Upside Seeking', points: 1 },
      { optionLetter: 'B', optionText: '70% Capital Protection, 30% Upside Seeking', points: 2 },
      { optionLetter: 'C', optionText: '40% Capital Protection, 60% Upside Seeking', points: 3 },
      { optionLetter: 'D', optionText: '10% Capital Protection, 90% Upside Seeking', points: 5 },
    ],
  },
];

export const seedRiskQuestions = async (): Promise<void> => {
  const count = await RiskQuestion.countDocuments();
  if (count > 0) {
    logger.info({ count }, 'Risk questions already seeded. Skipping seeder.');
    return;
  }

  logger.info('Seeding 14 standard risk appetite questions...');
  await RiskQuestion.insertMany(QUESTIONS_DATA);
  logger.info('Risk appetite questions seeded successfully.');
};
