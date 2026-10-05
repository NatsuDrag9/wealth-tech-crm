package com.wealthtech.crm.infrastructure.ai.security;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.entity.ClientProfile;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;

/**
 * Bidirectional PII Minimization and Tokenization Gateway.
 * Intercepts LLM prompt inputs to mask sensitive identity attributes (forward pass)
 * and restores genuine client values upon response delivery (backward pass).
 */
@Service
@Slf4j
public class PiiProtectionGateway {

    private static final Pattern PAN_PATTERN = Pattern.compile("\\b[A-Z]{5}[0-9]{4}[A-Z]\\b");
    private static final Pattern PHONE_PATTERN = Pattern.compile("(?:(?:\\+|00)91[\\-\\s]?)?[6-9]\\d{9}\\b");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b");
    private static final Pattern AADHAAR_PATTERN = Pattern.compile("\\b\\d{4}[\\s\\-]\\d{4}[\\s\\-]\\d{4}\\b");

    private final MeterRegistry meterRegistry;
    private final Timer tokenizationTimer;

    public PiiProtectionGateway(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.tokenizationTimer = Timer.builder("pii_tokenization_latency_seconds")
                .description("Latency of PII redaction and tokenization operations")
                .register(meterRegistry);
    }

    /**
     * Forward pass: Replaces known client entity fields and universal PII patterns
     * with opaque surrogate tokens (e.g. {{CLIENT_NAME_1}}, {{CLIENT_PAN_1}}).
     *
     * @param rawText Input prompt or query text
     * @param client  Optional client entity
     * @param profile Optional client KYC profile
     * @return PiiTokenizationResult containing sanitized text and ephemeral vault
     */
    public PiiTokenizationResult tokenize(String rawText, Client client, ClientProfile profile) {
        if (rawText == null || rawText.isBlank()) {
            return new PiiTokenizationResult(rawText, Collections.emptyMap());
        }

        long startTime = System.nanoTime();
        Map<String, String> vault = new LinkedHashMap<>();
        String sanitized = rawText;

        try {
            // Layer 1: Deterministic Known Entity Redaction
            if (client != null) {
                sanitized = redactKnownEntity(sanitized, client, profile, vault);
            }

            // Layer 2: Universal Pattern Detection (Defensive Fallback for free-form PII)
            sanitized = redactUniversalPatterns(sanitized, vault);

            return new PiiTokenizationResult(sanitized, vault);
        } finally {
            tokenizationTimer.record(System.nanoTime() - startTime, TimeUnit.NANOSECONDS);
        }
    }

    /**
     * Forward pass overload for generic text without authenticated client context.
     *
     * @param rawText Text to scan and sanitize
     * @return PiiTokenizationResult containing sanitized text and token vault
     */
    public PiiTokenizationResult tokenizeText(String rawText) {
        return tokenize(rawText, null, null);
    }

    /**
     * Backward pass: Replaces surrogate tokens in LLM response text with original values.
     *
     * @param responseText Text containing surrogate tokens
     * @param vault        Ephemeral token map
     * @return De-tokenized, authentic text
     */
    public String rehydrate(String responseText, Map<String, String> vault) {
        if (responseText == null || responseText.isBlank() || vault == null || vault.isEmpty()) {
            return responseText;
        }

        String result = responseText;
        for (Map.Entry<String, String> entry : vault.entrySet()) {
            result = result.replace(entry.getKey(), entry.getValue());
        }
        return result;
    }

    /**
     * Backward pass using database entity directly (used by asynchronous background workers
     * like PDF generation that load state from PostgreSQL without request-scoped vaults).
     *
     * @param text    Text containing standard surrogate tokens
     * @param client  Client entity from DB
     * @param profile ClientProfile entity from DB
     * @return Rehydrated text
     */
    public String rehydrateWithEntity(String text, Client client, ClientProfile profile) {
        if (text == null || text.isBlank() || client == null) {
            return text;
        }

        String result = text;
        String fullName = buildFullName(client.getFirstName(), client.getLastName());

        if (!fullName.isBlank()) {
            result = result.replace("{{CLIENT_NAME_1}}", fullName);
            result = result.replace("{{CLIENT_FULL_NAME_1}}", fullName);
        }
        if (client.getFirstName() != null && !client.getFirstName().isBlank()) {
            result = result.replace("{{CLIENT_FIRST_NAME_1}}", client.getFirstName());
        }
        if (client.getLastName() != null && !client.getLastName().isBlank()) {
            result = result.replace("{{CLIENT_LAST_NAME_1}}", client.getLastName());
        }
        if (client.getPan() != null && !client.getPan().isBlank()) {
            result = result.replace("{{CLIENT_PAN_1}}", client.getPan());
        }
        if (client.getPhone() != null && !client.getPhone().isBlank()) {
            result = result.replace("{{CLIENT_PHONE_1}}", client.getPhone());
        }
        if (client.getEmail() != null && !client.getEmail().isBlank()) {
            result = result.replace("{{CLIENT_EMAIL_1}}", client.getEmail());
        }
        if (profile != null) {
            if (profile.getAddressLine() != null && !profile.getAddressLine().isBlank()) {
                result = result.replace("{{CLIENT_ADDRESS_1}}", profile.getAddressLine());
            }
            if (profile.getPincode() != null && !profile.getPincode().isBlank()) {
                result = result.replace("{{CLIENT_PINCODE_1}}", profile.getPincode());
            }
        }

        return result;
    }

    private String redactKnownEntity(String text, Client client, ClientProfile profile, Map<String, String> vault) {
        // Collect candidate values and sort by length descending to prevent partial match collisions
        Map<String, String> entityValues = new LinkedHashMap<>();

        String fullName = buildFullName(client.getFirstName(), client.getLastName());
        if (!fullName.isBlank()) {
            entityValues.put("{{CLIENT_NAME_1}}", fullName);
        }
        if (client.getEmail() != null && !client.getEmail().isBlank()) {
            entityValues.put("{{CLIENT_EMAIL_1}}", client.getEmail().trim());
        }
        if (client.getPan() != null && !client.getPan().isBlank()) {
            entityValues.put("{{CLIENT_PAN_1}}", client.getPan().trim());
        }
        if (client.getPhone() != null && !client.getPhone().isBlank()) {
            entityValues.put("{{CLIENT_PHONE_1}}", client.getPhone().trim());
        }
        if (profile != null && profile.getAddressLine() != null && !profile.getAddressLine().isBlank()) {
            entityValues.put("{{CLIENT_ADDRESS_1}}", profile.getAddressLine().trim());
        }
        if (profile != null && profile.getPincode() != null && !profile.getPincode().isBlank()) {
            entityValues.put("{{CLIENT_PINCODE_1}}", profile.getPincode().trim());
        }

        // Sort by value length descending so longer phrases match before substrings
        List<Map.Entry<String, String>> sortedEntries = new ArrayList<>(entityValues.entrySet());
        sortedEntries.sort((a, b) -> Integer.compare(b.getValue().length(), a.getValue().length()));

        String currentText = text;
        for (Map.Entry<String, String> entry : sortedEntries) {
            String token = entry.getKey();
            String rawVal = entry.getValue();

            if (currentText.contains(rawVal)) {
                currentText = currentText.replace(rawVal, token);
                vault.put(token, rawVal);
                recordMetric(getEntityTypeFromToken(token));
            }
        }

        return currentText;
    }

    private String redactUniversalPatterns(String text, Map<String, String> vault) {
        String currentText = text;
        currentText = applyPattern(currentText, PAN_PATTERN, "PAN", vault);
        currentText = applyPattern(currentText, AADHAAR_PATTERN, "AADHAAR", vault);
        currentText = applyPattern(currentText, PHONE_PATTERN, "PHONE", vault);
        currentText = applyPattern(currentText, EMAIL_PATTERN, "EMAIL", vault);
        return currentText;
    }

    private String applyPattern(String text, Pattern pattern, String entityType, Map<String, String> vault) {
        Matcher matcher = pattern.matcher(text);
        StringBuffer sb = new StringBuffer();
        int counter = 1;

        while (matcher.find()) {
            String match = matcher.group();

            // Check if already captured in vault
            String existingToken = findExistingToken(vault, match);
            String token;
            if (existingToken != null) {
                token = existingToken;
            } else {
                token = String.format("{{CLIENT_%s_%d}}", entityType, counter++);
                vault.put(token, match);
                recordMetric(entityType);
            }

            matcher.appendReplacement(sb, Matcher.quoteReplacement(token));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String findExistingToken(Map<String, String> vault, String rawValue) {
        for (Map.Entry<String, String> entry : vault.entrySet()) {
            if (entry.getValue().equalsIgnoreCase(rawValue)) {
                return entry.getKey();
            }
        }
        return null;
    }

    private String buildFullName(String firstName, String lastName) {
        StringBuilder sb = new StringBuilder();
        if (firstName != null && !firstName.isBlank()) {
            sb.append(firstName.trim());
        }
        if (lastName != null && !lastName.isBlank()) {
            if (!sb.isEmpty()) {
                sb.append(" ");
            }
            sb.append(lastName.trim());
        }
        return sb.toString();
    }

    private String getEntityTypeFromToken(String token) {
        if (token.contains("NAME")) return "NAME";
        if (token.contains("PAN")) return "PAN";
        if (token.contains("PHONE")) return "PHONE";
        if (token.contains("EMAIL")) return "EMAIL";
        if (token.contains("ADDRESS")) return "ADDRESS";
        if (token.contains("PINCODE")) return "PINCODE";
        if (token.contains("AADHAAR")) return "AADHAAR";
        return "UNKNOWN";
    }

    private void recordMetric(String entityType) {
        Counter.builder("pii_redacted_tokens_total")
                .tag("entity_type", entityType)
                .description("Total number of PII tokens sanitized and redacted")
                .register(meterRegistry)
                .increment();
    }
}
