import express from 'express';
import passport from 'passport';
import '../config/db/passport.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import { verifyToken } from '../config/db/auth.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import analysisSalesController from '../app/Controller/analysisSalesController.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`

const router = express.Router();

router.route('/analyticsSalesPerHour').post(verifyToken, analysisSalesController.updateHourlyStats);

export default router;