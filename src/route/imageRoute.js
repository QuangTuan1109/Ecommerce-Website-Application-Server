import express from 'express';
import passport from 'passport';
import imageController from '../app/Controller/imageController.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`

const router = express.Router();

import '../config/db/passport.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`

router.route('/add-image').post(imageController.AddImage); 

export default router;
