package com.wealthtech.crm.modules.riskappetite.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wealthtech.crm.modules.riskappetite.dto.*;
import com.wealthtech.crm.modules.riskappetite.service.RaService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

// APIs
// Get questions
// Get latest risk-assessment of a client - clientId
// Start assessment
// Submit answer of a particular raId 
// Get results of a particular risk-assessment - raId

@RestController 
@RequestMapping("/java-wtc-api/v1")
@RequiredArgsConstructor
public class RaController {
    private final RaService raService;

    // Full question bank
    @GetMapping("/risk-questions")
    @PreAuthorize("hasAuthority('riskappetite:read')")
    public ResponseEntity<List<RaQuestionResponse>> getQuestions() {
        List<RaQuestionResponse> response = raService.getQuestions();
        return ResponseEntity.ok(response);
    }

    // Latest completed assessment
    @GetMapping("/risk-assessments/clients/{clientId}/latest")
    @PreAuthorize("hasAuthority('riskappetite:read') or hasAuthority('portfolioreview:read')")
    public ResponseEntity<RaResultResponse> getLatestCompletedAssessment(@PathVariable Long clientId) {
        RaResultResponse response = raService.getLatestCompletedAssessment(clientId);
        return ResponseEntity.ok(response);
    }

    // Result detail for the completion Popup
    @GetMapping("/risk-assessments/{raId}/results")
    @PreAuthorize("hasAuthority('riskappetite:read')")
    public ResponseEntity<RaResultResponse> getAssessmentResult(@PathVariable Long raId) {
        RaResultResponse response = raService.getAssessmentResult(raId);
        return ResponseEntity.ok(response);
    }

    // Start or resume assessment
    @PostMapping("/risk-assessments/start-assessment")
    @PreAuthorize("hasAuthority('riskappetite:create')")
    public ResponseEntity<RaStartResponse> startAssessment(@Valid @RequestBody StartAssessmentRequest request) {
        RaStartResponse response = raService.startOrResumeAssessment(request.clientId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Submit answer
    @PostMapping("/risk-assessments/{raId}/submit-answer")
    @PreAuthorize("hasAuthority('riskappetite:update')")
    public ResponseEntity<Void> submitAnswer(@PathVariable Long raId, @Valid @RequestBody SubmitAnswerRequest request) {
        raService.submitAnswer(raId, request);
        return ResponseEntity.ok().build();
    }

    // 6. Finalize & compute server-side score                                                                                             
        @PostMapping("/risk-assessments/{raId}/complete-assessment")                                                                           
        @PreAuthorize("hasAuthority('riskappetite:update')")                                                                                   
        public ResponseEntity<RaResultResponse> completeAssessment(@PathVariable Long raId) {                                        
            RaResultResponse response = raService.completeAssessment(raId);                                              
            return ResponseEntity.ok(response);                                                                                                
        }   
}
