import './config/dns.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { createApp } from './app.js';
import { startScheduler } from './jobs/scheduler.js';
import { logger } from './utils/logger.js';
import { recordErrorEvent } from './utils/errorEvents.js';

const app = createApp();

async function start(): Promise<void> {
  await connectDatabase();
  startScheduler();
  app.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT}`);
  });
}

start().catch((error: unknown) => {
  logger.error('Failed to start server', {
    message: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : 'Unhandled rejection';
  logger.error('unhandled_rejection', { message, category: 'unhandled' });
  recordErrorEvent({
    timestamp: new Date().toISOString(),
    status: 500,
    category: 'unhandled',
    message: 'Unhandled rejection',
    code: 'UNHANDLED_REJECTION'
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('uncaught_exception', { message: error.message, category: 'unhandled' });
  recordErrorEvent({
    timestamp: new Date().toISOString(),
    status: 500,
    category: 'unhandled',
    message: 'Uncaught exception',
    code: 'UNCAUGHT_EXCEPTION'
  });
  if (env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

export { app };
