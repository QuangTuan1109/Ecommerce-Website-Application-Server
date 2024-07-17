import express from 'express';
import '../config/db/passport.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import { verifyToken } from '../config/db/auth.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import paymentController from '../app/Controller/paymentController.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`

const router = express.Router();

router.route('/momo').post(verifyToken, paymentController.MomoPayment);

export default router;
