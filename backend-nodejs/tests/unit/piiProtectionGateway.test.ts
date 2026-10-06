import { describe, it, expect } from 'vitest';
import { piiProtectionGateway, ClientIdentityContext } from '../../src/common/services/piiProtectionGateway';

describe('PII Minimization & Tokenization Gateway', () => {
  describe('Known Entity Redaction & Rehydration (Layer 1)', () => {
    const clientContext: ClientIdentityContext = {
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'rahul.sharma@example.com',
      phone: '9876543210',
      pan: 'ABCDE1234F',
      addressLine: 'Flat 402, Lotus Towers',
      pincode: '400050',
    };

    it('should redact all known client entity fields and rehydrate successfully', () => {
      const rawPrompt =
        'Review portfolio for Rahul Sharma (PAN: ABCDE1234F, email: rahul.sharma@example.com, phone: 9876543210) living at Flat 402, Lotus Towers, 400050.';

      const result = piiProtectionGateway.tokenize(rawPrompt, clientContext);

      expect(result.sanitizedText).not.toContain('Rahul Sharma');
      expect(result.sanitizedText).not.toContain('ABCDE1234F');
      expect(result.sanitizedText).not.toContain('rahul.sharma@example.com');
      expect(result.sanitizedText).not.toContain('9876543210');
      expect(result.sanitizedText).not.toContain('Flat 402, Lotus Towers');
      expect(result.sanitizedText).not.toContain('400050');

      expect(result.sanitizedText).toContain('{{CLIENT_NAME_1}}');
      expect(result.sanitizedText).toContain('{{CLIENT_PAN_1}}');
      expect(result.sanitizedText).toContain('{{CLIENT_EMAIL_1}}');
      expect(result.sanitizedText).toContain('{{CLIENT_PHONE_1}}');
      expect(result.sanitizedText).toContain('{{CLIENT_ADDRESS_1}}');
      expect(result.sanitizedText).toContain('{{CLIENT_PINCODE_1}}');

      // Backward pass rehydration
      const rehydrated = result.rehydrate(result.sanitizedText);
      expect(rehydrated).toBe(rawPrompt);
    });

    it('should prioritize full name over single name components to prevent partial collision', () => {
      const prompt = 'Client Rahul Sharma and his brother Rahul both hold mutual funds.';
      const result = piiProtectionGateway.tokenize(prompt, { firstName: 'Rahul', lastName: 'Sharma' });

      expect(result.sanitizedText).toContain('Client {{CLIENT_NAME_1}} and his brother');
    });
  });

  describe('Universal Pattern Redaction (Layer 2)', () => {
    it('should detect and redact universal PAN, phone, Aadhaar, and email patterns without entity context', () => {
      const text =
        'Transferred ₹50,000 to PAN BKZPK8291M, phone +91 9123456780, aadhaar 1234-5678-9012, email advisor.lead@wealthtech.org.';

      const result = piiProtectionGateway.tokenize(text);

      expect(result.sanitizedText).not.toContain('BKZPK8291M');
      expect(result.sanitizedText).not.toContain('9123456780');
      expect(result.sanitizedText).not.toContain('1234-5678-9012');
      expect(result.sanitizedText).not.toContain('advisor.lead@wealthtech.org');

      expect(result.sanitizedText).toContain('{{CLIENT_PAN_1}}');
      expect(result.sanitizedText).toContain('{{CLIENT_PHONE_1}}');
      expect(result.sanitizedText).toContain('{{CLIENT_AADHAAR_1}}');
      expect(result.sanitizedText).toContain('{{CLIENT_EMAIL_1}}');

      // Backward pass
      const rehydrated = result.rehydrate(result.sanitizedText);
      expect(rehydrated).toBe(text);
    });
  });

  describe('Async Worker Entity Rehydration', () => {
    it('should rehydrate standard tokens directly from DB client context without memory vault', () => {
      const template =
        'Prepared investment recommendation for {{CLIENT_NAME_1}} (PAN: {{CLIENT_PAN_1}}, Phone: {{CLIENT_PHONE_1}}).';
      const client: ClientIdentityContext = {
        firstName: 'Priya',
        lastName: 'Nair',
        pan: 'XYZPA9988K',
        phone: '9822012345',
      };

      const hydrated = piiProtectionGateway.rehydrateWithEntity(template, client);

      expect(hydrated).toBe(
        'Prepared investment recommendation for Priya Nair (PAN: XYZPA9988K, Phone: 9822012345).'
      );
    });
  });

  describe('Empty and Edge Inputs', () => {
    it('should handle empty or blank string gracefully', () => {
      const emptyResult = piiProtectionGateway.tokenize('');
      expect(emptyResult.sanitizedText).toBe('');
      expect(Object.keys(emptyResult.tokenVault).length).toBe(0);

      const nullResult = piiProtectionGateway.tokenize(null as unknown as string);
      expect(nullResult.sanitizedText).toBeNull();
    });
  });
});
