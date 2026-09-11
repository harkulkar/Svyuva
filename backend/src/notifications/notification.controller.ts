import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { ok } from '../utils/apiResponse.js';
import {
  getNotification,
  getNotificationPreferences,
  listNotifications,
  markAllRead,
  markRead,
  unreadSummary,
  updateNotificationPreferences
} from './notification.service.js';

function requireUser(req: Request) {
  if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.authUser;
}

export async function notificationsList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const result = await listNotifications(user, req.query as unknown as { page: number; limit: number; type?: string; from?: string; to?: string; unread?: boolean });
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function notificationsUnread(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    res.json(ok(await unreadSummary(user), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function notificationDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    res.json(ok({ notification: await getNotification(user, String(req.params.id)) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function notificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    res.json(ok({ notification: await markRead(user, String(req.params.id)) }, 'Marked as read'));
  } catch (error) {
    next(error);
  }
}

export async function notificationsReadAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    res.json(ok(await markAllRead(user), 'Marked as read'));
  } catch (error) {
    next(error);
  }
}

export async function notificationPrefs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    res.json(ok(await getNotificationPreferences(user), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function patchNotificationPrefs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const prefs = await updateNotificationPreferences(user, req.body, req);
    res.json(ok(prefs, 'Preferences updated'));
  } catch (error) {
    next(error);
  }
}
