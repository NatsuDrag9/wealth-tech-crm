import { describe, it, expect } from 'vitest';
import { RagConversationTurn } from '../../src/modules/portfolioreview/models/RagConversationTurn';

describe('RagConversationTurn Model & Schema Validation', () => {
  it('should validate a complete conversation turn entity successfully', () => {
    const turn = new RagConversationTurn({
      conversationId: 'conv-session-101',
      turnIndex: 1,
      userQuery: 'What is the risk rating for Parag Parikh Flexi Cap Fund?',
      synthesizedAnswer:
        'Parag Parikh Flexi Cap Fund carries a Very High risk rating per SEBI Product Labeling [Source 1].',
      isGrounded: true,
      clientId: '65f1a2b3c4d5e6f7a8b9c0d1',
      createdAt: new Date(),
    });

    const error = turn.validateSync();
    expect(error).toBeUndefined();
    expect(turn.conversationId).toBe('conv-session-101');
    expect(turn.turnIndex).toBe(1);
    expect(turn.isGrounded).toBe(true);
  });

  it('should fail validation when required fields are missing', () => {
    const invalidTurn = new RagConversationTurn({});
    const error = invalidTurn.validateSync();

    expect(error).toBeDefined();
    expect(error?.errors.conversationId).toBeDefined();
    expect(error?.errors.turnIndex).toBeDefined();
    expect(error?.errors.userQuery).toBeDefined();
    expect(error?.errors.synthesizedAnswer).toBeDefined();
  });

  it('should default isGrounded to true and createdAt to current timestamp when omitted', () => {
    const turn = new RagConversationTurn({
      conversationId: 'conv-session-102',
      turnIndex: 2,
      userQuery: 'What is the minimum lock-in period for ELSS?',
      synthesizedAnswer: 'The statutory lock-in period for ELSS funds is 3 years [Source 1].',
    });

    expect(turn.isGrounded).toBe(true);
    expect(turn.createdAt).toBeInstanceOf(Date);
  });
});
