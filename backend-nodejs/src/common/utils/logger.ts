import pino from 'pino';
import { config } from '../../config/environment';

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'password',
      '*.password',
      'req.headers.authorization',
      'req.headers.cookie',
      'pan',
      '*.pan',
      'accountNumber',
      '*.accountNumber',
      'refreshToken',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
  transport:
    config.nodeEnv !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
