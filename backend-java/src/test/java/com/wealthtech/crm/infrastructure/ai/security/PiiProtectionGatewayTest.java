package com.wealthtech.crm.infrastructure.ai.security;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.entity.ClientProfile;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

class PiiProtectionGatewayTest {

    private PiiProtectionGateway gateway;
    private SimpleMeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        gateway = new PiiProtectionGateway(meterRegistry);
    }

    @Test
    @DisplayName("Should redact known client entity fields and rehydrate successfully")
    void testEntityTokenizationAndRehydration() {
        Client client = Client.builder()
                .firstName("Rahul")
                .lastName("Sharma")
                .email("rahul.sharma@example.com")
                .phone("9876543210")
                .pan("ABCDE1234F")
                .build();

        ClientProfile profile = ClientProfile.builder()
                .addressLine("Flat 402, Lotus Towers")
                .pincode("400050")
                .build();

        String rawPrompt = "Review portfolio for Rahul Sharma (PAN: ABCDE1234F, email: rahul.sharma@example.com, phone: 9876543210) living at Flat 402, Lotus Towers, 400050.";

        PiiTokenizationResult result = gateway.tokenize(rawPrompt, client, profile);

        assertThat(result.sanitizedText())
                .doesNotContain("Rahul Sharma")
                .doesNotContain("ABCDE1234F")
                .doesNotContain("rahul.sharma@example.com")
                .doesNotContain("9876543210")
                .doesNotContain("Flat 402, Lotus Towers")
                .doesNotContain("400050");

        assertThat(result.sanitizedText())
                .contains("{{CLIENT_NAME_1}}")
                .contains("{{CLIENT_PAN_1}}")
                .contains("{{CLIENT_EMAIL_1}}")
                .contains("{{CLIENT_PHONE_1}}")
                .contains("{{CLIENT_ADDRESS_1}}")
                .contains("{{CLIENT_PINCODE_1}}");

        // Backward pass
        String rehydrated = result.rehydrate(result.sanitizedText());
        assertThat(rehydrated).isEqualTo(rawPrompt);
    }

    @Test
    @DisplayName("Should detect universal regex patterns for PAN, Email, Phone, and Aadhaar without client entity")
    void testUniversalPatternDetection() {
        String freeText = "Client mentioned tax ID BKZPK8291M, phone +91 9123456780, aadhaar 1234-5678-9012, and contact investor@sample.in.";

        PiiTokenizationResult result = gateway.tokenizeText(freeText);

        assertThat(result.sanitizedText())
                .doesNotContain("BKZPK8291M")
                .doesNotContain("9123456780")
                .doesNotContain("1234-5678-9012")
                .doesNotContain("investor@sample.in");

        assertThat(result.sanitizedText())
                .contains("{{CLIENT_PAN_1}}")
                .contains("{{CLIENT_PHONE_1}}")
                .contains("{{CLIENT_AADHAAR_1}}")
                .contains("{{CLIENT_EMAIL_1}}");

        String rehydrated = result.rehydrate(result.sanitizedText());
        assertThat(rehydrated).isEqualTo(freeText);
    }

    @Test
    @DisplayName("Should support entity rehydration for async workers without request-scoped map")
    void testEntityRehydrationForAsyncWorker() {
        Client client = Client.builder()
                .firstName("Priya")
                .lastName("Nair")
                .pan("XYZPA9988K")
                .phone("9822012345")
                .email("priya.nair@example.com")
                .build();

        String templateText = "Proposal for {{CLIENT_NAME_1}} (PAN: {{CLIENT_PAN_1}}, Email: {{CLIENT_EMAIL_1}}).";

        String hydrated = gateway.rehydrateWithEntity(templateText, client, null);

        assertThat(hydrated).isEqualTo("Proposal for Priya Nair (PAN: XYZPA9988K, Email: priya.nair@example.com).");
    }

    @Test
    @DisplayName("Should handle empty or blank text gracefully")
    void testEmptyTextHandling() {
        PiiTokenizationResult emptyResult = gateway.tokenize("", null, null);
        assertThat(emptyResult.sanitizedText()).isEmpty();
        assertThat(emptyResult.tokenVault()).isEmpty();

        PiiTokenizationResult nullResult = gateway.tokenize(null, null, null);
        assertThat(nullResult.sanitizedText()).isNull();
    }
}
