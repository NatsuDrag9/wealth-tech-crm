package com.wealthtech.crm.modules.riskappetite.service;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.modules.riskappetite.dto.RaResultResponse;
import com.wealthtech.crm.modules.riskappetite.entity.RiskAssessment;
import com.wealthtech.crm.modules.riskappetite.enums.AssessmentStatus;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;
import com.wealthtech.crm.modules.riskappetite.repository.RaAnswerRepository;
import com.wealthtech.crm.modules.riskappetite.repository.RaOptionRepository;
import com.wealthtech.crm.modules.riskappetite.repository.RaQuestionRepository;
import com.wealthtech.crm.modules.riskappetite.repository.RaRepository;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;

@ExtendWith(MockitoExtension.class)
class RiskAppetiteServiceTest {

    @Mock
    private RaQuestionRepository qRepo;
    @Mock
    private RaOptionRepository optRepo;
    @Mock
    private RaRepository assessmentRepo;
    @Mock
    private RaAnswerRepository answerRepo;

    @InjectMocks
    private RaService raService;

    @ParameterizedTest
    @CsvSource({
            "14, VERY_CONSERVATIVE",
            "28, VERY_CONSERVATIVE",
            "29, CONSERVATIVE",
            "42, CONSERVATIVE",
            "43, MODERATE",
            "56, MODERATE",
            "57, AGGRESSIVE",
            "63, AGGRESSIVE",
            "64, VERY_AGGRESSIVE",
            "70, VERY_AGGRESSIVE"
    })
    @DisplayName("Should correctly classify risk assessment score boundaries into SEBI categories")
    void testScoreCategoryFromScoreBoundaries(int score, ScoreCategory expectedCategory) {
        ScoreCategory derived = ScoreCategory.fromScore(score);
        assertThat(derived).isEqualTo(expectedCategory);
    }

    @Test
    @DisplayName("Should return latest completed assessment when found")
    void testGetLatestCompletedAssessment() {
        RiskAssessment assessment = RiskAssessment.builder()
                .id(1L)
                .clientId(5L)
                .status(AssessmentStatus.COMPLETED)
                .totalScore(50)
                .scoreCategory(ScoreCategory.MODERATE)
                .build();

        when(assessmentRepo.findTopByClientIdAndStatusOrderByCompletedAtDesc(5L, AssessmentStatus.COMPLETED))
                .thenReturn(Optional.of(assessment));

        RaResultResponse response = raService.getLatestCompletedAssessment(5L);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.totalScore()).isEqualTo(50);
        assertThat(response.scoreCategory().code()).isEqualTo("moderate");
    }

    @Test
    @DisplayName("Should throw NotFoundException when no completed assessment exists for client")
    void testGetLatestCompletedAssessmentNotFound() {
        when(assessmentRepo.findTopByClientIdAndStatusOrderByCompletedAtDesc(99L, AssessmentStatus.COMPLETED))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> raService.getLatestCompletedAssessment(99L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("No completed risk assessment found for client: 99");
    }
}
