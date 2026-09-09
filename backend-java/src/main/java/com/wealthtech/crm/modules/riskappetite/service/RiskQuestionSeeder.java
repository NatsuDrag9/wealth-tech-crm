package com.wealthtech.crm.modules.riskappetite.service;

import com.wealthtech.crm.modules.riskappetite.entity.RiskOption;
import com.wealthtech.crm.modules.riskappetite.entity.RiskQuestion;
import com.wealthtech.crm.modules.riskappetite.repository.RaQuestionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class RiskQuestionSeeder implements CommandLineRunner {

        private final RaQuestionRepository questionRepository;

        public RiskQuestionSeeder(RaQuestionRepository questionRepository) {
                this.questionRepository = questionRepository;
        }

        @Override
        @Transactional
        public void run(String... args) {
                if (questionRepository.count() > 0) {
                        return;
                }

                seedQuestion(1, "What is your primary investment goal?",
                                "Assesses the primary objective: capital preservation vs. aggressive capital growth.",
                                List.of(
                                                new OptionData("A", "Capital preservation with minimum risk", 1),
                                                new OptionData("B", "Stable income generation with moderate safety", 2),
                                                new OptionData("C", "Balanced growth and income", 3),
                                                new OptionData("D", "Aggressive long-term wealth appreciation", 5)));

                seedQuestion(2, "What is your intended investment horizon for this portfolio?",
                                "Assesses the duration capital can remain invested without liquidation.",
                                List.of(
                                                new OptionData("A", "Less than 1 year", 1),
                                                new OptionData("B", "1 to 3 years", 2),
                                                new OptionData("C", "3 to 5 years", 3),
                                                new OptionData("D", "More than 5 years", 5)));

                seedQuestion(3, "How would you react if your portfolio dropped by 20% over a 3-month period?",
                                "Measures emotional tolerance and behavioral panic-selling risk during drawdowns.",
                                List.of(
                                                new OptionData("A",
                                                                "Sell all remaining assets immediately to prevent further loss",
                                                                1),
                                                new OptionData("B",
                                                                "Move a significant portion into cash or fixed deposits",
                                                                2),
                                                new OptionData("C", "Hold and wait for market recovery", 3),
                                                new OptionData("D", "Buy more at discounted valuations", 5)));

                seedQuestion(4, "What is your level of investment knowledge and past market experience?",
                                "Determines familiarity with asset classes and market volatility.",
                                List.of(
                                                new OptionData("A",
                                                                "Novice: Only familiar with bank savings and fixed deposits",
                                                                1),
                                                new OptionData("B", "Basic: Have invested in mutual funds occasionally",
                                                                2),
                                                new OptionData("C",
                                                                "Moderate: Familiar with equity stocks, bonds, and funds",
                                                                3),
                                                new OptionData("D",
                                                                "Advanced: Actively invest across equities, derivatives, and alternatives",
                                                                5)));

                seedQuestion(5, "What percentage of your total liquid net worth are you planning to invest?",
                                "Measures capital concentration risk relative to total wealth.",
                                List.of(
                                                new OptionData("A", "More than 75% of liquid assets", 1),
                                                new OptionData("B", "50% to 75% of liquid assets", 2),
                                                new OptionData("C", "25% to 50% of liquid assets", 3),
                                                new OptionData("D", "Less than 25% of liquid assets", 5)));

                seedQuestion(6, "How secure and predictable is your current and future income stream?",
                                "Evaluates capacity to absorb potential investment shortfalls from regular income.",
                                List.of(
                                                new OptionData("A", "Highly unstable or seasonal income", 1),
                                                new OptionData("B", "Moderately stable with occasional fluctuations",
                                                                2),
                                                new OptionData("C", "Stable and predictable employment/business income",
                                                                3),
                                                new OptionData("D",
                                                                "Very secure with substantial multiple revenue streams",
                                                                5)));

                seedQuestion(7, "Do you have an emergency fund covering at least 6 months of living expenses?",
                                "Assesses liquidity buffer to prevent premature portfolio redemptions.",
                                List.of(
                                                new OptionData("A", "No emergency fund at all", 1),
                                                new OptionData("B", "Less than 3 months of expenses", 2),
                                                new OptionData("C", "3 to 6 months of expenses", 3),
                                                new OptionData("D",
                                                                "More than 6 months of expenses comfortably set aside",
                                                                5)));

                seedQuestion(8, "Which return vs risk tradeoff describes your preference best?",
                                "Identifies investor utility curve between safety and returns.",
                                List.of(
                                                new OptionData("A",
                                                                "Guaranteed 5-6% return with zero capital loss risk",
                                                                1),
                                                new OptionData("B",
                                                                "Potential 7-9% return with small, rare fluctuations",
                                                                2),
                                                new OptionData("C",
                                                                "Potential 10-14% return with moderate yearly fluctuations",
                                                                3),
                                                new OptionData("D",
                                                                "Potential 15-20%+ return with high probability of substantial short-term dips",
                                                                5)));

                seedQuestion(9, "What are your debt and financial liability obligations?",
                                "Measures debt-to-income and debt service drag on overall risk capacity.",
                                List.of(
                                                new OptionData("A",
                                                                "Heavy debt: Over 50% of monthly income goes toward EMIs",
                                                                1),
                                                new OptionData("B", "Moderate debt: 25% to 50% of monthly income", 2),
                                                new OptionData("C", "Low debt: Less than 25% of monthly income", 3),
                                                new OptionData("D",
                                                                "Zero debt and no major pending financial liabilities",
                                                                5)));

                seedQuestion(10, "How do you view inflation risk compared to market risk?",
                                "Measures willingness to accept market risk to avoid purchasing power erosion.",
                                List.of(
                                                new OptionData("A",
                                                                "I prefer guaranteed safety even if inflation erodes purchasing power",
                                                                1),
                                                new OptionData("B", "I want to match inflation with minimum risk", 2),
                                                new OptionData("C",
                                                                "I want to beat inflation by a modest margin (2-4%)",
                                                                3),
                                                new OptionData("D",
                                                                "I want substantial real wealth growth well above inflation",
                                                                5)));

                seedQuestion(11, "Have you ever invested in volatile assets like mid/small-caps or sector funds?",
                                "Validates past behavior under actual market volatility.",
                                List.of(
                                                new OptionData("A", "Never, and I do not intend to", 1),
                                                new OptionData("B",
                                                                "Invested once but sold due to discomfort with drops",
                                                                2),
                                                new OptionData("C",
                                                                "Currently hold small allocations in equity growth funds",
                                                                3),
                                                new OptionData("D",
                                                                "Comfortable with high-beta equities and dynamic allocation",
                                                                5)));

                seedQuestion(12, "How frequently do you expect to monitor your portfolio performance?",
                                "Measures risk of behavioral over-trading and anxiety over daily noise.",
                                List.of(
                                                new OptionData("A", "Daily or multiple times a day", 1),
                                                new OptionData("B", "Weekly", 2),
                                                new OptionData("C", "Monthly or quarterly", 3),
                                                new OptionData("D",
                                                                "Annually, with focus strictly on long-term compounding",
                                                                5)));

                seedQuestion(13, "When do you anticipate needing to make your first major withdrawal?",
                                "Assesses liquidity constraints on portfolio construction.",
                                List.of(
                                                new OptionData("A", "Within the next 6 to 12 months", 1),
                                                new OptionData("B", "In 1 to 3 years", 2),
                                                new OptionData("C", "In 3 to 7 years", 3),
                                                new OptionData("D", "Not for at least 7 to 10+ years", 5)));

                seedQuestion(14, "If given a choice between protecting your capital vs maximizing upside, you choose:",
                                "Final holistic calibration of risk tolerance versus risk aversion.",
                                List.of(
                                                new OptionData("A", "100% Capital Protection, 0% Upside Seeking", 1),
                                                new OptionData("B", "70% Capital Protection, 30% Upside Seeking", 2),
                                                new OptionData("C", "40% Capital Protection, 60% Upside Seeking", 3),
                                                new OptionData("D", "10% Capital Protection, 90% Upside Seeking", 5)));
        }

        private void seedQuestion(int order, String questionText, String rationale, List<OptionData> options) {
                RiskQuestion question = RiskQuestion.builder()
                                .displayOrder(order)
                                .questionText(questionText)
                                .rationale(rationale)
                                .build();

                for (OptionData opt : options) {
                        RiskOption option = RiskOption.builder()
                                        .question(question)
                                        .optionLetter(opt.letter())
                                        .optionText(opt.text())
                                        .points(opt.points())
                                        .build();
                        question.getOptions().add(option);
                }

                questionRepository.save(question);
        }

        private record OptionData(String letter, String text, int points) {
        }
}
