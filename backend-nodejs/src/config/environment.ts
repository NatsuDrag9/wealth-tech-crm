import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend-nodejs/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/nodejs-wtc-api/v1',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/wealthtech_crm',
  jwtSecret: process.env.JWT_SECRET || 'wealthtech_crm_super_secret_jwt_key_dev_2026',
  jwtExpiry: process.env.JWT_EXPIRY || '15m',
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
    s3Bucket: process.env.S3_BUCKET_NAME || 'wealthtech-crm-documents',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    forcePathStyle: process.env.AWS_FORCE_PATH_STYLE !== 'false',
  },
};
