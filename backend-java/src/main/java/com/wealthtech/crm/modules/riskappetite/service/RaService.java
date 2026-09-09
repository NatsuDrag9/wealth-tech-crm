package com.wealthtech.crm.modules.riskappetite.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.wealthtech.crm.modules.riskappetite.dto.*;
import com.wealthtech.crm.modules.riskappetite.entity.*;
import com.wealthtech.crm.modules.riskappetite.enums.AssessmentStatus;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;
import com.wealthtech.crm.modules.riskappetite.repository.RaAnswerRepository;
import com.wealthtech.crm.modules.riskappetite.repository.RaOptionRepository;
import com.wealthtech.crm.modules.riskappetite.repository.RaQuestionRepository;
import com.wealthtech.crm.modules.riskappetite.repository.RaRepository;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

// Get questions
// Start assessment or resume assessment
// Submit answer
// Complete assessment
// Get latest completed assessment

@Service
@RequiredArgsConstructor
public class RaService {
    private final RaQuestionRepository qRepo;
    private final RaOptionRepository optRepo;
    private final RaRepository assessmentRepo;
    private final RaAnswerRepository answerRepo;

    public List<RaQuestionResponse> getQuestions() {
        return qRepo.findAllByOrderByDisplayOrderAsc().stream().map(this::mapToQuestionResponse).toList();
    }

    @Transactional
    public RaStartResponse startOrResumeAssessment(Long clientId) {
        RiskAssessment assessment = assessmentRepo
                .findTopByClientIdAndStatusOrderByCreatedAtDesc(clientId, AssessmentStatus.IN_PROGRESS)
                .orElseGet(() -> assessmentRepo.save(
                        RiskAssessment.builder().clientId(clientId).status(AssessmentStatus.IN_PROGRESS).build()));

        List<RaAnswerResponse> answers = answerRepo.findByAssessmentId(assessment.getId()).stream()
                .map(a -> new RaAnswerResponse(
                        a.getId(),
                        a.getQuestion().getId(),
                        a.getSelectedOption().getId(),
                        a.getCreatedAt()))
                .toList();

        return new RaStartResponse(
                assessment.getId(),
                assessment.getClientId(),
                assessment.getStatus().name(),
                answers);
    }

    public RaResultResponse getAssessmentResult(Long assessmentId) {
        RiskAssessment assessment = assessmentRepo.findById(assessmentId)
                .orElseThrow(() -> new NotFoundException("Assessment not found with id: " + assessmentId));
        return mapToResultResponse(assessment);
    }

    public RaResultResponse getLatestCompletedAssessment(Long clientId) {
        RiskAssessment assessment = assessmentRepo
                .findTopByClientIdAndStatusOrderByCompletedAtDesc(clientId, AssessmentStatus.COMPLETED)
                .orElseThrow(() -> new NotFoundException("No completed risk assessment found for client: " + clientId));
        return mapToResultResponse(assessment);
    }

    @Transactional
    public void submitAnswer(Long assessmentId, SubmitAnswerRequest request) {
        RiskAssessment assessment = assessmentRepo.findById(assessmentId).orElseThrow(() -> new NotFoundException("Assessment not found with id: " + assessmentId));

        if(assessment.getStatus() == AssessmentStatus.COMPLETED) {
                throw new IllegalStateException("Cannot submit answers for a completed assessment");
        }

        RiskQuestion question = qRepo.findById(request.questionId()).orElseThrow(() -> new NotFoundException("Question not found with id: " + request.questionId()));

        RiskOption option = optRepo.findById(request.optionId()).orElseThrow(() -> new NotFoundException("Option not found with id: " + request.optionId()));

        RiskAnswer answer = answerRepo.findByAssessmentIdAndQuestionId(assessmentId, question.getId()).
        orElseGet(() -> RiskAnswer.builder()
        .assessment(assessment)
        .question(question)
        .build());

        answer.setSelectedOption(option);
        answerRepo.save(answer);
    }

   @Transactional 
   public RaResultResponse completeAssessment(Long assessmentId) {
        RiskAssessment assessment = assessmentRepo.findById(assessmentId).orElseThrow(() -> new NotFoundException("Assessment not found with id: " + assessmentId));

        List <RiskAnswer> answers = answerRepo.findByAssessmentId(assessmentId);
        long totalQuestions = qRepo.count();

        if(answers.size() < totalQuestions) {
                throw new IllegalStateException("All " + totalQuestions + " must be answered before completing the assessment");
        }

        int totalScore = answers.stream().mapToInt(a -> a.getSelectedOption().getPoints()).sum();

        ScoreCategory category = ScoreCategory.fromScore(totalScore);

        assessment.setStatus(AssessmentStatus.COMPLETED);
        assessment.setTotalScore(totalScore);
        assessment.setScoreCategory(category);
        assessment.setCompletedAt(LocalDateTime.now());

        RiskAssessment saved = assessmentRepo.save(assessment);
        return mapToResultResponse(saved);
   }

    private RaQuestionResponse mapToQuestionResponse(RiskQuestion q) {
        List<RaOptionResponse> options = q.getOptions().stream()
                .map(opt -> new RaOptionResponse(
                        opt.getId(),
                        opt.getOptionLetter(),
                        opt.getOptionText(),
                        opt.getPoints()))
                .toList();

        return new RaQuestionResponse(
                q.getId(),
                q.getQuestionText(),
                q.getRationale(),
                q.getDisplayOrder(),
                options);

    }

    private RaResultResponse mapToResultResponse(RiskAssessment a) {
        ScoreCategoryResponse catResponse = a.getScoreCategory() != null ? new ScoreCategoryResponse(
                a.getScoreCategory().getCode(),
                a.getScoreCategory().getDisplayName(),
                a.getScoreCategory().getMinScore(),
                a.getScoreCategory().getMaxScore())
                : null;

        return new RaResultResponse(
                a.getId(),
                a.getClientId(),
                a.getStatus().name(),
                a.getTotalScore(),
                catResponse,
                a.getCreatedAt(),
                a.getCompletedAt());
    }
}
