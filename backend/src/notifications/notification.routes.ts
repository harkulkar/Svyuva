import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { notificationLimiter } from '../middleware/rateLimit.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  notificationDetail,
  notificationPrefs,
  notificationRead,
  notificationsList,
  notificationsReadAll,
  notificationsUnread,
  patchNotificationPrefs
} from './notification.controller.js';
import { notificationListQuerySchema, notificationPrefsSchema } from './notification.validators.js';
import { pushStatus, pushSubscribeDisabled } from '../controllers/schemeRecords.controller.js';

export const notificationRouter = Router();
notificationRouter.use(authenticate, notificationLimiter);
notificationRouter.get('/', validateQuery(notificationListQuerySchema), notificationsList);
notificationRouter.get('/unread', notificationsUnread);
notificationRouter.get('/preferences', notificationPrefs);
notificationRouter.patch('/preferences', validateBody(notificationPrefsSchema), patchNotificationPrefs);
notificationRouter.post('/read-all', notificationsReadAll);
notificationRouter.get('/push/status', pushStatus);
notificationRouter.post('/push/subscribe', pushSubscribeDisabled);
notificationRouter.delete('/push/subscribe', pushSubscribeDisabled);
notificationRouter.get('/:id', notificationDetail);
notificationRouter.patch('/:id/read', notificationRead);
