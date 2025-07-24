import express from 'express'
import { generateRecomendation } from '../controllers/ai.js';

export const airouter = express.Router();

airouter.post("/getRecomendations",generateRecomendation)