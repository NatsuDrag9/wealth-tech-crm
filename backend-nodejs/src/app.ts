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

import { register, httpRequestDurationSeconds } from './common/metrics/metrics';

export const createApp = (): Application => {
  const app = express();

  // 1. Structured HTTP Request Logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === `${config.apiPrefix}/metrics`,
      },
    })
  );

  // 2. Metrics Recording Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const durationInSeconds = seconds + nanoseconds / 1e9;
      const route = req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : req.path;
      httpRequestDurationSeconds
        .labels(req.method, route, res.statusCode.toString())
        .observe(durationInSeconds);
    });
    next();
  });

  // 3. Global Pre-middleware
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

  // 4. Centralized Wire Response Formatter (camelCase to snake_case)
  app.use(snakeCaseResponse);

  // 5. Operational Health Check & Metrics Routes
  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'ok',
      service: 'wealth-tech-crm-backend-nodejs',
      timestamp: new Date().toISOString(),
    });
  });

  app.get(`${config.apiPrefix}/metrics`, async (_req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', register.contentType);
      const metricsData = await register.metrics();
      return res.status(200).send(metricsData);
    } catch (err: unknown) {
      logger.error({ err }, 'Failed to generate Prometheus metrics');
      return res.status(500).send('Failed to generate metrics');
    }
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
