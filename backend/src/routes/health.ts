import { Router } from 'express';
import { getDatabaseHealth, getHealth } from '../controllers/healthController.js';

export const healthRouter = Router();

healthRouter.get('/', getHealth);
healthRouter.get('/db', getDatabaseHealth);
