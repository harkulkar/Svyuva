import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, isProduction } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestContext } from './middleware/requestContext.js';
import { maintenanceMode } from './middleware/maintenanceMode.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { getAppVersion } from './config/version.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (isProduction) {
    app.set('trust proxy', 1);
  }
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: isProduction ? { maxAge: 15_552_000, includeSubDomains: true } : false
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        const allowed = new Set([env.CLIENT_URL, env.FRONTEND_ORIGIN, env.FRONTEND_URL].filter(Boolean));
        if (!isProduction) {
          allowed.add('http://localhost:5173');
          allowed.add('http://localhost:5174');
        }
        if (!origin || allowed.has(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true
    })
  );
  app.use(requestContext);
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(maintenanceMode);

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'SV Yuva Suraksha Yojana API',
      data: { phase: 13, version: getAppVersion(), health: '/api/health' }
    });
  });

  app.use('/api', apiLimiter, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
