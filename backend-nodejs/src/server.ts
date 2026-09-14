import { app } from './app';
import { config } from './config/environment';
import { connectDatabase } from './config/db';
import { logger } from './common/utils/logger';
import { seedPermissions } from './modules/usermanager/seeders/permissionSeeder';
import { seedAdmin } from './modules/usermanager/seeders/adminSeeder';
import { seedRiskQuestions } from './modules/riskappetite/seeders/riskQuestionSeeder';
import { seedEligibleFunds } from './modules/portfolioreview/seeders/eligibleFundSeeder';
import { s3Service } from './common/services/s3Service';

const startServer = async (): Promise<void> => {
  try {
    // 1. Establish MongoDB Connection
    await connectDatabase();

    // 2. Execute Idempotent Database Seeders & Cloud Infrastructure Verification
    await seedPermissions();
    await seedAdmin();
    await seedRiskQuestions();
    await seedEligibleFunds();
    await s3Service.ensureBucketExists();

    // 3. Start HTTP Server
    const server = app.listen(config.port, () => {
      logger.info(
        {
          port: config.port,
          env: config.nodeEnv,
          apiPrefix: config.apiPrefix,
        },
        'WealthTech CRM Node.js backend server started successfully'
      );
    });

    // 4. Graceful Shutdown Signal Traps
    const handleShutdown = (signal: string) => {
      logger.info({ signal }, 'Graceful shutdown signal received. Closing HTTP server...');

      server.close(() => {
        logger.info('HTTP server closed successfully. Terminating process.');
        process.exit(0);
      });

      // Forceful termination if connections don't drain within 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown invoked: Active connections timed out after 10s.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.fatal({ error: errorMessage }, 'Fatal server startup failure');
    process.exit(1);
  }
};

startServer();
