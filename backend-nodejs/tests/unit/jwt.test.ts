import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../src/common/utils/jwt';
import { config } from '../../src/config/environment';

describe('JWT Utility (Slim Token Pattern)', () => {
  const testEmail = 'advisor@wealthtech.com';

  describe('Access Token', () => {
    it('should generate a valid access token with email in subject and payload', () => {
      const token = generateAccessToken(testEmail);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded.email).toBe(testEmail);

      const rawDecoded = jwt.decode(token) as jwt.JwtPayload;
      expect(rawDecoded.sub).toBe(testEmail);
      expect(rawDecoded.exp).toBeDefined();
      expect(rawDecoded.iat).toBeDefined();

      // Access token lifespan should be ~15 minutes (900 seconds)
      const lifespanSeconds = (rawDecoded.exp as number) - (rawDecoded.iat as number);
      expect(lifespanSeconds).toBe(900);
    });

    it('should reject an access token with an invalid/tampered signature', () => {
      const token = generateAccessToken(testEmail);
      const tamperedToken = token.slice(0, -6) + 'abcdef';

      expect(() => verifyToken(tamperedToken)).toThrow(jwt.JsonWebTokenError);
    });

    it('should reject an expired access token', () => {
      const expiredToken = jwt.sign({ email: testEmail }, config.jwtSecret, {
        expiresIn: '-1s',
        subject: testEmail,
      });

      expect(() => verifyToken(expiredToken)).toThrow(jwt.TokenExpiredError);
    });
  });

  describe('Refresh Token', () => {
    it('should generate a valid refresh token with 7-day lifespan', () => {
      const token = generateRefreshToken(testEmail);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded.email).toBe(testEmail);

      const rawDecoded = jwt.decode(token) as jwt.JwtPayload;
      expect(rawDecoded.sub).toBe(testEmail);

      // Refresh token lifespan should be 7 days (604800 seconds)
      const lifespanSeconds = (rawDecoded.exp as number) - (rawDecoded.iat as number);
      expect(lifespanSeconds).toBe(7 * 24 * 60 * 60);
    });

    it('should reject a tampered refresh token', () => {
      const token = generateRefreshToken(testEmail);
      const tamperedToken = token.slice(0, -6) + 'xyz123';

      expect(() => verifyToken(tamperedToken)).toThrow(jwt.JsonWebTokenError);
    });

    it('should reject an expired refresh token', () => {
      const expiredRefreshToken = jwt.sign({ email: testEmail }, config.jwtSecret, {
        expiresIn: '-10s',
        subject: testEmail,
      });

      expect(() => verifyToken(expiredRefreshToken)).toThrow(jwt.TokenExpiredError);
    });
  });
});
