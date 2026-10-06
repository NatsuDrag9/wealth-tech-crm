import { describe, it, expect } from 'vitest';
import { getScoreCategoryFromScore, ScoreCategoryCode } from '../../src/modules/riskappetite/enums/riskEnums';

describe('SEBI Risk Profiling & Scoring Engine (14-70 Scale)', () => {
  describe('Boundary Score Mapping', () => {
    it('should map scores 14-28 to Very Conservative', () => {
      const minCategory = getScoreCategoryFromScore(14);
      expect(minCategory.code).toBe(ScoreCategoryCode.VERY_CONSERVATIVE);
      expect(minCategory.displayName).toBe('Very Conservative');

      const midCategory = getScoreCategoryFromScore(20);
      expect(midCategory.code).toBe(ScoreCategoryCode.VERY_CONSERVATIVE);

      const maxCategory = getScoreCategoryFromScore(28);
      expect(maxCategory.code).toBe(ScoreCategoryCode.VERY_CONSERVATIVE);
    });

    it('should map scores 29-42 to Conservative', () => {
      const minCategory = getScoreCategoryFromScore(29);
      expect(minCategory.code).toBe(ScoreCategoryCode.CONSERVATIVE);
      expect(minCategory.displayName).toBe('Conservative');

      const maxCategory = getScoreCategoryFromScore(42);
      expect(maxCategory.code).toBe(ScoreCategoryCode.CONSERVATIVE);
    });

    it('should map scores 43-56 to Moderate', () => {
      const minCategory = getScoreCategoryFromScore(43);
      expect(minCategory.code).toBe(ScoreCategoryCode.MODERATE);
      expect(minCategory.displayName).toBe('Moderate');

      const maxCategory = getScoreCategoryFromScore(56);
      expect(maxCategory.code).toBe(ScoreCategoryCode.MODERATE);
    });

    it('should map scores 57-63 to Aggressive', () => {
      const minCategory = getScoreCategoryFromScore(57);
      expect(minCategory.code).toBe(ScoreCategoryCode.AGGRESSIVE);
      expect(minCategory.displayName).toBe('Aggressive');

      const maxCategory = getScoreCategoryFromScore(63);
      expect(maxCategory.code).toBe(ScoreCategoryCode.AGGRESSIVE);
    });

    it('should map scores 64-70 to Very Aggressive', () => {
      const minCategory = getScoreCategoryFromScore(64);
      expect(minCategory.code).toBe(ScoreCategoryCode.VERY_AGGRESSIVE);
      expect(minCategory.displayName).toBe('Very Aggressive');

      const maxCategory = getScoreCategoryFromScore(70);
      expect(maxCategory.code).toBe(ScoreCategoryCode.VERY_AGGRESSIVE);
    });
  });

  describe('Out-of-Bounds Clamping', () => {
    it('should clamp scores below 14 to Very Conservative', () => {
      expect(getScoreCategoryFromScore(13).code).toBe(ScoreCategoryCode.VERY_CONSERVATIVE);
      expect(getScoreCategoryFromScore(0).code).toBe(ScoreCategoryCode.VERY_CONSERVATIVE);
      expect(getScoreCategoryFromScore(-10).code).toBe(ScoreCategoryCode.VERY_CONSERVATIVE);
    });

    it('should clamp scores above 70 to Very Aggressive', () => {
      expect(getScoreCategoryFromScore(71).code).toBe(ScoreCategoryCode.VERY_AGGRESSIVE);
      expect(getScoreCategoryFromScore(100).code).toBe(ScoreCategoryCode.VERY_AGGRESSIVE);
    });
  });
});
