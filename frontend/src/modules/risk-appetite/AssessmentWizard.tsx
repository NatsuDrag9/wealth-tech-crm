import {
  useState,
  useMemo,
  type ReactElement,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  X,
} from 'lucide-react';
import { MainButton } from '@/components/buttons';
import {
  useGetRiskQuestionsQuery,
  useSubmitAnswerMutation,
  useCompleteAssessmentMutation,
} from '@/services/api/riskAppetiteApi';
import type {
  RiskAnswer,
  AssessmentResultResponse,
} from '@/definitions/riskAppetiteTypes';
import './AssessmentWizard.scss';

interface AssessmentWizardProps {
  raId: string | number;
  initialAnswers?: RiskAnswer[];
  onComplete: (result: AssessmentResultResponse) => void;
  onCancel: () => void;
}

export function AssessmentWizard({
  raId,
  initialAnswers = [],
  onComplete,
  onCancel,
}: AssessmentWizardProps): ReactElement {
  const {
    data: rawQuestions = [],
    isLoading: isLoadingQuestions,
  } = useGetRiskQuestionsQuery();
  const [submitAnswer] = useSubmitAnswerMutation();
  const [completeAssessment, { isLoading: isCompleting }] = useCompleteAssessmentMutation();

  const sortedQuestions = useMemo(
    () => [...rawQuestions].sort((a, b) => {
      const orderA = a.displayOrder ?? a.order ?? 0;
      const orderB = b.displayOrder ?? b.order ?? 0;
      return orderA - orderB;
    }),
    [rawQuestions],
  );

  // Map of questionId -> optionId
  const [answers, setAnswers] = useState<Record<string, string>>(() => (
    Object.fromEntries(
      initialAnswers.map((ans) => [String(ans.questionId), String(ans.optionId)]),
    )
  ));

  const [currentIndex, setCurrentIndex] = useState(0);

  const totalQuestions = sortedQuestions.length;
  const currentQuestion = sortedQuestions[currentIndex];

  const answeredCount = useMemo(
    () => sortedQuestions.filter((q) => Boolean(answers[String(q.id)])).length,
    [sortedQuestions, answers],
  );

  const progressPercent = totalQuestions > 0
    ? Math.round(((currentIndex + 1) / totalQuestions) * 100)
    : 0;

  const isCurrentAnswered = currentQuestion
    ? Boolean(answers[String(currentQuestion.id)])
    : false;

  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  async function handleSelectOption(optionId: string | number) {
    if (!currentQuestion) return;

    const qIdStr = String(currentQuestion.id);
    const optIdStr = String(optionId);

    // Optimistic local update
    setAnswers((prev) => ({
      ...prev,
      [qIdStr]: optIdStr,
    }));

    // Server-side persistence
    try {
      await submitAnswer({
        raId,
        questionId: currentQuestion.id,
        optionId,
      }).unwrap();
    } catch {
      // In case of error, answer is still stored in local state for seamless UX
    }
  }

  function handleNext() {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  async function handleFinalize() {
    try {
      const result = await completeAssessment({ raId }).unwrap();
      onComplete(result);
    } catch {
      // RTK Query error handled gracefully
    }
  }

  if (isLoadingQuestions) {
    return (
      <div className="assessment-wizard">
        <p className="assessment-wizard__question-text">Loading risk questions...</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="assessment-wizard">
        <p className="assessment-wizard__question-text">No risk assessment questions available.</p>
        <div className="assessment-wizard__footer">
          <MainButton
            label="Cancel"
            variant="secondary"
            size="md"
            onClick={onCancel}
          />
        </div>
      </div>
    );
  }

  const selectedOptionId = answers[String(currentQuestion.id)];

  return (
    <div className="assessment-wizard">
      {/* Header with Progress Bar */}
      <header className="assessment-wizard__header">
        <div className="assessment-wizard__meta">
          <span className="assessment-wizard__progress-count">
            Question
            {' '}
            {currentIndex + 1}
            {' '}
            of
            {' '}
            {totalQuestions}
          </span>
          <span className="assessment-wizard__percent-pill">
            {answeredCount}
            {' '}
            of
            {' '}
            {totalQuestions}
            {' '}
            Answered
          </span>
        </div>

        <div className="assessment-wizard__progress-bar">
          <div
            className="assessment-wizard__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Question Content */}
      <div className="assessment-wizard__question-container">
        <div className="assessment-wizard__question-header">
          <span className="assessment-wizard__question-tag">
            Question
            {' '}
            {String(currentIndex + 1).padStart(2, '0')}
          </span>
          <h2 className="assessment-wizard__question-text">
            {currentQuestion.questionText}
          </h2>
        </div>

        {currentQuestion.rationale ? (
          <div className="assessment-wizard__rationale">
            <HelpCircle size={18} />
            <div>
              <strong>SEBI Compliance Rationale: </strong>
              {currentQuestion.rationale}
            </div>
          </div>
        ) : null}

        {/* Options Radiogroup */}
        <div
          className="assessment-wizard__options-list"
          role="radiogroup"
          aria-label={currentQuestion.questionText}
        >
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOptionId === String(option.id);
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`assessment-wizard__option-card ${
                  isSelected ? 'assessment-wizard__option-card--selected' : ''
                }`}
                onClick={() => handleSelectOption(option.id)}
              >
                <span className="assessment-wizard__option-letter">
                  {option.optionLetter}
                </span>

                <span className="assessment-wizard__option-text">
                  {option.optionText}
                </span>

                <span className="assessment-wizard__radio-indicator">
                  <span className="assessment-wizard__radio-dot" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Footer */}
      <footer className="assessment-wizard__footer">
        <MainButton
          label="Exit Assessment"
          variant="secondary"
          size="md"
          icon={<X size={16} />}
          iconPosition="left"
          onClick={onCancel}
        />

        <div className="assessment-wizard__navigation-buttons">
          <MainButton
            label="Previous"
            variant="secondary"
            size="md"
            icon={<ChevronLeft size={16} />}
            iconPosition="left"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          />

          {!isLastQuestion ? (
            <MainButton
              label="Next"
              variant="primary"
              size="md"
              icon={<ChevronRight size={16} />}
              iconPosition="right"
              onClick={handleNext}
              disabled={!isCurrentAnswered}
            />
          ) : (
            <MainButton
              label="Complete & Calculate Score"
              variant="primary"
              size="md"
              icon={<CheckCircle2 size={16} />}
              iconPosition="left"
              onClick={handleFinalize}
              disabled={!isAllAnswered}
              isLoading={isCompleting}
            />
          )}
        </div>
      </footer>
    </div>
  );
}
