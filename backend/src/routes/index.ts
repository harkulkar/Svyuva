import { Router } from 'express';
import { healthRouter } from './health.js';
import { authRouter } from './auth.js';
import { adminRouter } from './admin.js';
import { collegeRouter } from './college.js';
import { publicDataRouter } from './publicData.js';
import { aiRouter } from '../ai/ai.routes.js';
import { notificationRouter } from '../notifications/notification.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/', publicDataRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/college', collegeRouter);
