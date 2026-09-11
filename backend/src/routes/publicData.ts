import { Router } from 'express';
import { getMasterData, getUniversities } from '../controllers/publicDataController.js';

export const publicDataRouter = Router();
publicDataRouter.get('/universities', getUniversities);
publicDataRouter.get('/master-data', getMasterData);
