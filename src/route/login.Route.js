import express from 'express';
import passport from 'passport';
import Login from '../app/Controller/login.Controller.js';
import { verifyToken } from '../config/db/auth.js';

const router = express.Router();

import '../config/db/passport.js';

router.post('/signup', Login.SignUp);

router.patch('/signup-seller', passport.authenticate('jwt', {
    session: false
}), Login.SignUpSeller);

router.post('/signin', passport.authenticate('local', {
    session: false
}), Login.SignIn);

router.post('/signin-seller', verifyToken, Login.SignInSeller);

router.route('/upload-avt').post(Login.handleFileUpload, Login.handleUploadImage);

router.route('/delete-avt/:imagePath').delete(Login.deleteImage);

export default router;
