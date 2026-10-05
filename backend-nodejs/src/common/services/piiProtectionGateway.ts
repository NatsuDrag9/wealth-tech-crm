import { logger } from '../utils/logger';
import { piiRedactedTokensTotal, piiTokenizationDurationSeconds } from '../metrics/metrics';

export interface PiiTokenizationResult {
  readonly sanitizedText: string;
  readonly tokenVault: Readonly<Record<string, string>>;
  rehydrate(responseText: string): string;
}

export interface ClientIdentityContext {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  pan?: string;
  addressLine?: string;
  pincode?: string;
}

/**
 * Bidirectional PII Minimization and Tokenization Gateway.
 * Strips sensitive identity attributes from LLM prompts (forward pass)
 * and restores authentic data upon delivery (backward pass).
 */
export class PiiProtectionGateway {
  private static readonly PAN_PATTERN = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
  private static readonly PHONE_PATTERN = /(?:(?:\+|00)91[\-\s]?)?[6-9]\d{9}\b/g;
  private static readonly EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  private static readonly AADHAAR_PATTERN = /\b\d{4}[\s\-]\d{4}[\s\-]\d{4}\b/g;

  /**
   * Forward pass: Replaces known client entity fields and universal PII patterns
   * with opaque surrogate tokens (e.g. {{CLIENT_NAME_1}}, {{CLIENT_PAN_1}}).
   */
  public tokenize(rawText: string, clientContext?: ClientIdentityContext): PiiTokenizationResult {
    if (!rawText || rawText.trim().length === 0) {
      return {
        sanitizedText: rawText,
        tokenVault: Object.freeze({}),
        rehydrate: (text: string) => text,
      };
    }

    const endTimer = piiTokenizationDurationSeconds.startTimer({ status: 'success' });
    const vault: Record<string, string> = {};
    let sanitized = rawText;

    try {
      // Layer 1: Deterministic Known Entity Redaction
      if (clientContext) {
        sanitized = this.redactKnownEntity(sanitized, clientContext, vault);
      }

      // Layer 2: Universal Pattern Detection (Defensive Fallback)
      sanitized = this.redactUniversalPatterns(sanitized, vault);

      const immutableVault = Object.freeze({ ...vault });

      return {
        sanitizedText: sanitized,
        tokenVault: immutableVault,
        rehydrate: (responseText: string) => this.rehydrate(responseText, immutableVault),
      };
    } catch (error) {
      logger.error({ err: error }, 'PII tokenization failed unexpectedly');
      endTimer({ status: 'failure' });
      throw error;
    } finally {
      endTimer();
    }
  }

  /**
   * Backward pass: Replaces surrogate tokens in response text with original values.
   */
  public rehydrate(responseText: string, vault: Readonly<Record<string, string>>): string {
    if (!responseText || Object.keys(vault).length === 0) {
      return responseText;
    }

    let result = responseText;
    for (const [token, originalValue] of Object.entries(vault)) {
      result = result.split(token).join(originalValue);
    }
    return result;
  }

  /**
   * Backward pass using database client entity directly (for async jobs like PDF export).
   */
  public rehydrateWithEntity(text: string, clientContext: ClientIdentityContext): string {
    if (!text || !clientContext) {
      return text;
    }

    let result = text;
    const fullName = this.buildFullName(clientContext.firstName, clientContext.lastName);

    if (fullName) {
      result = result.split('{{CLIENT_NAME_1}}').join(fullName);
      result = result.split('{{CLIENT_FULL_NAME_1}}').join(fullName);
    }
    if (clientContext.firstName) {
      result = result.split('{{CLIENT_FIRST_NAME_1}}').join(clientContext.firstName);
    }
    if (clientContext.lastName) {
      result = result.split('{{CLIENT_LAST_NAME_1}}').join(clientContext.lastName);
    }
    if (clientContext.pan) {
      result = result.split('{{CLIENT_PAN_1}}').join(clientContext.pan);
    }
    if (clientContext.phone) {
      result = result.split('{{CLIENT_PHONE_1}}').join(clientContext.phone);
    }
    if (clientContext.email) {
      result = result.split('{{CLIENT_EMAIL_1}}').join(clientContext.email);
    }
    if (clientContext.addressLine) {
      result = result.split('{{CLIENT_ADDRESS_1}}').join(clientContext.addressLine);
    }
    if (clientContext.pincode) {
      result = result.split('{{CLIENT_PINCODE_1}}').join(clientContext.pincode);
    }

    return result;
  }

  private redactKnownEntity(
    text: string,
    client: ClientIdentityContext,
    vault: Record<string, string>
  ): string {
    const candidates: Array<{ token: string; value: string }> = [];

    const fullName = this.buildFullName(client.firstName, client.lastName);
    if (fullName) {
      candidates.push({ token: '{{CLIENT_NAME_1}}', value: fullName });
    }
    if (client.email?.trim()) {
      candidates.push({ token: '{{CLIENT_EMAIL_1}}', value: client.email.trim() });
    }
    if (client.pan?.trim()) {
      candidates.push({ token: '{{CLIENT_PAN_1}}', value: client.pan.trim() });
    }
    if (client.phone?.trim()) {
      candidates.push({ token: '{{CLIENT_PHONE_1}}', value: client.phone.trim() });
    }
    if (client.addressLine?.trim()) {
      candidates.push({ token: '{{CLIENT_ADDRESS_1}}', value: client.addressLine.trim() });
    }
    if (client.pincode?.trim()) {
      candidates.push({ token: '{{CLIENT_PINCODE_1}}', value: client.pincode.trim() });
    }

    // Sort descending by value length to replace compound strings before substrings
    candidates.sort((a, b) => b.value.length - a.value.length);

    let currentText = text;
    for (const { token, value } of candidates) {
      if (currentText.includes(value)) {
        currentText = currentText.split(value).join(token);
        vault[token] = value;
        this.recordMetric(this.getEntityTypeFromToken(token));
      }
    }

    return currentText;
  }

  private redactUniversalPatterns(text: string, vault: Record<string, string>): string {
    let currentText = text;
    currentText = this.applyPattern(currentText, PiiProtectionGateway.PAN_PATTERN, 'PAN', vault);
    currentText = this.applyPattern(currentText, PiiProtectionGateway.AADHAAR_PATTERN, 'AADHAAR', vault);
    currentText = this.applyPattern(currentText, PiiProtectionGateway.PHONE_PATTERN, 'PHONE', vault);
    currentText = this.applyPattern(currentText, PiiProtectionGateway.EMAIL_PATTERN, 'EMAIL', vault);
    return currentText;
  }

  private applyPattern(
    text: string,
    pattern: RegExp,
    entityType: string,
    vault: Record<string, string>
  ): string {
    pattern.lastIndex = 0;
    let counter = 1;

    return text.replace(pattern, (match) => {
      const existingToken = this.findExistingToken(vault, match);
      if (existingToken) {
        return existingToken;
      }

      const token = `{{CLIENT_${entityType}_${counter++}}}`;
      vault[token] = match;
      this.recordMetric(entityType);
      return token;
    });
  }

  private findExistingToken(vault: Record<string, string>, rawValue: string): string | null {
    const lowerRaw = rawValue.toLowerCase();
    for (const [token, value] of Object.entries(vault)) {
      if (value.toLowerCase() === lowerRaw) {
        return token;
      }
    }
    return null;
  }

  private buildFullName(firstName?: string, lastName?: string): string {
    const parts: string[] = [];
    if (firstName?.trim()) parts.push(firstName.trim());
    if (lastName?.trim()) parts.push(lastName.trim());
    return parts.join(' ');
  }

  private getEntityTypeFromToken(token: string): string {
    if (token.includes('NAME')) return 'NAME';
    if (token.includes('PAN')) return 'PAN';
    if (token.includes('PHONE')) return 'PHONE';
    if (token.includes('EMAIL')) return 'EMAIL';
    if (token.includes('ADDRESS')) return 'ADDRESS';
    if (token.includes('PINCODE')) return 'PINCODE';
    if (token.includes('AADHAAR')) return 'AADHAAR';
    return 'UNKNOWN';
  }

  private recordMetric(entityType: string): void {
    piiRedactedTokensTotal.inc({ entity_type: entityType });
  }
}

export const piiProtectionGateway = new PiiProtectionGateway();
