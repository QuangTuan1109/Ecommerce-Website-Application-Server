import express from 'express';
import { verifyToken } from '../config/db/auth.js';

const router = express.Router();

import getUserInfor from '../app/Controller/user.Controller.js';

router.get('/', verifyToken, getUserInfor);

export default router;
