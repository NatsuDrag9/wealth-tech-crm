import { describe, it, expect } from 'vitest';
import { piiProtectionGateway } from '../../src/common/services/piiProtectionGateway';

describe('PiiProtectionGateway Unit Tests', () => {
  it('should redact known client entity attributes and rehydrate successfully', () => {
    const rawText =
      'Review portfolio for Rahul Sharma (PAN: ABCDE1234F, Email: rahul.sharma@example.com, Phone: 9876543210) residing at Flat 402, Lotus Towers, 400050.';

    const clientContext = {
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'rahul.sharma@example.com',
      phone: '9876543210',
      pan: 'ABCDE1234F',
      addressLine: 'Flat 402, Lotus Towers',
      pincode: '400050',
    };

    const tokenized = piiProtectionGateway.tokenize(rawText, clientContext);

    expect(tokenized.sanitizedText).not.toContain('Rahul Sharma');
    expect(tokenized.sanitizedText).not.toContain('ABCDE1234F');
    expect(tokenized.sanitizedText).not.toContain('rahul.sharma@example.com');
    expect(tokenized.sanitizedText).not.toContain('9876543210');
    expect(tokenized.sanitizedText).not.toContain('Flat 402, Lotus Towers');
    expect(tokenized.sanitizedText).not.toContain('400050');

    expect(tokenized.sanitizedText).toContain('{{CLIENT_NAME_1}}');
    expect(tokenized.sanitizedText).toContain('{{CLIENT_PAN_1}}');
    expect(tokenized.sanitizedText).toContain('{{CLIENT_EMAIL_1}}');
    expect(tokenized.sanitizedText).toContain('{{CLIENT_PHONE_1}}');
    expect(tokenized.sanitizedText).toContain('{{CLIENT_ADDRESS_1}}');
    expect(tokenized.sanitizedText).toContain('{{CLIENT_PINCODE_1}}');

    const rehydrated = tokenized.rehydrate(tokenized.sanitizedText);
    expect(rehydrated).toBe(rawText);
  });

  it('should detect universal regex patterns for PAN, Email, Phone, and Aadhaar without client context', () => {
    const freeText =
      'Tax ID is BKZPK8291M, phone is +91 9123456780, national ID is 1234-5678-9012, email is investor@sample.in.';

    const tokenized = piiProtectionGateway.tokenize(freeText);

    expect(tokenized.sanitizedText).not.toContain('BKZPK8291M');
    expect(tokenized.sanitizedText).not.toContain('9123456780');
    expect(tokenized.sanitizedText).not.toContain('1234-5678-9012');
    expect(tokenized.sanitizedText).not.toContain('investor@sample.in');

    expect(tokenized.sanitizedText).toContain('{{CLIENT_PAN_1}}');
    expect(tokenized.sanitizedText).toContain('{{CLIENT_PHONE_1}}');
    expect(tokenized.sanitizedText).toContain('{{CLIENT_AADHAAR_1}}');
    expect(tokenized.sanitizedText).toContain('{{CLIENT_EMAIL_1}}');

    const rehydrated = tokenized.rehydrate(tokenized.sanitizedText);
    expect(rehydrated).toBe(freeText);
  });

  it('should support entity rehydration for async workers without ephemeral map', () => {
    const client = {
      firstName: 'Priya',
      lastName: 'Nair',
      pan: 'XYZPA9988K',
      phone: '9822012345',
      email: 'priya.nair@example.com',
    };

    const template = 'Proposal for {{CLIENT_NAME_1}} (PAN: {{CLIENT_PAN_1}}, Email: {{CLIENT_EMAIL_1}}).';
    const hydrated = piiProtectionGateway.rehydrateWithEntity(template, client);

    expect(hydrated).toBe('Proposal for Priya Nair (PAN: XYZPA9988K, Email: priya.nair@example.com).');
  });

  it('should handle empty or whitespace text gracefully', () => {
    const emptyResult = piiProtectionGateway.tokenize('');
    expect(emptyResult.sanitizedText).toBe('');
    expect(Object.keys(emptyResult.tokenVault).length).toBe(0);
  });
});
