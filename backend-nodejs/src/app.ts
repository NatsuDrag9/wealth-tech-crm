import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { config } from './config/environment';
import { logger } from './common/utils/logger';
import { snakeCaseResponse } from './common/middleware/snakeCaseResponse';
import { errorHandler } from './common/utils/errorHandler';
import { AppError } from './common/utils/AppError';

import authRoutes from './modules/auth/routes/authRoutes';
import userManagerRoutes from './modules/usermanager/routes/userManagerRoutes';
import clientRoutes from './modules/customer/routes/clientRoutes';
import riskRoutes from './modules/riskappetite/routes/riskRoutes';
import portfolioRoutes from './modules/portfolioreview/routes/portfolioRoutes';

export const createApp = (): Application => {
  const app = express();

  // 1. Structured HTTP Request Logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    })
  );

  // 2. Global Pre-middleware
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 3. Centralized Wire Response Formatter (camelCase to snake_case)
  app.use(snakeCaseResponse);

  // 4. Operational Health Check Route
  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'ok',
      service: 'wealth-tech-crm-backend-nodejs',
      timestamp: new Date().toISOString(),
    });
  });

  // 5. Mount API Module Routers
  app.use(`${config.apiPrefix}/auth`, authRoutes);
  app.use(config.apiPrefix, userManagerRoutes);
  app.use(`${config.apiPrefix}/clients`, clientRoutes);
  app.use(config.apiPrefix, riskRoutes);
  app.use(config.apiPrefix, portfolioRoutes);

  // 6. Unmatched Route Fallback
  app.all('*', (req: Request, _res: Response, next: NextFunction) => {
    logger.warn({ method: req.method, url: req.originalUrl, ip: req.ip }, 'Route not found');
    next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server`, 404));
  });

  // 7. Centralized Global Error Handler (Must be the final middleware)
  app.use(errorHandler);

  return app;
};

export const app = createApp();
