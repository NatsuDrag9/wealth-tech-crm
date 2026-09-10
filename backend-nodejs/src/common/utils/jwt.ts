import jwt from 'jsonwebtoken';
import { config } from '../../config/environment';

export interface TokenPayload {
  email: string;
}

// Generate Access Token (15min default) containing ONLY email as subject
export const generateAccessToken = (email: string): string => {
  return jwt.sign({ email }, config.jwtSecret, {
    expiresIn: config.jwtExpiry as jwt.SignOptions['expiresIn'],
    subject: email,
  });
};

// Generate Refresh Token (7 days default) using email
export const generateRefreshToken = (email: string): string => {
  return jwt.sign({ email }, config.jwtSecret, {
    expiresIn: config.refreshTokenExpiry as jwt.SignOptions['expiresIn'],
    subject: email,
  });
};

// Verify and extract payload
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};