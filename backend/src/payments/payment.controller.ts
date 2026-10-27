import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { ok } from '../utils/apiResponse.js';
import {
  clearGatewayConfig,
  getGatewayAdminView,
  getPaymentAvailability,
  saveGatewayConfig,
  testGatewayConnection
} from './gatewayConfig.js';
import { createCollegePaymentOrder, getCollegePayment, handleRazorpayWebhook, verifyCollegePayment } from './paymentService.js';

function requireUser(req: Request) {
  if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.authUser;
}

export async function adminGatewayGet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUser(req);
    res.json(ok(await getGatewayAdminView(req), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminGatewayPut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await saveGatewayConfig(req.body, requireUser(req), req), 'Payment gateway settings saved'));
  } catch (error) {
    next(error);
  }
}

export async function adminGatewayClear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await clearGatewayConfig(requireUser(req), String(req.body.currentPassword), req), 'Payment gateway credentials removed'));
  } catch (error) {
    next(error);
  }
}

export async function adminGatewayTest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await testGatewayConnection(requireUser(req), req), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegePaymentAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUser(req);
    res.json(ok(await getPaymentAvailability(), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegeCreatePaymentOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await createCollegePaymentOrder(requireUser(req), req.body, req), 'Payment order created'));
  } catch (error) {
    next(error);
  }
}

export async function collegeVerifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok({ payment: await verifyCollegePayment(requireUser(req), req.body, req) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegePaymentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok({ payment: await getCollegePayment(requireUser(req), String(req.params.id)) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function razorpayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const eventId = req.get('x-razorpay-event-id') || undefined;
    const result = await handleRazorpayWebhook(req.rawBody, req.get('x-razorpay-signature') || undefined, eventId);
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}
