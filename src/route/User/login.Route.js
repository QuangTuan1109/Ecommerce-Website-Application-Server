const express = require('express');
const router = express.Router();
const passport = require('passport');
const Login = require('../../app/Controller/User/login.Controller');
const auth = require('../../config/db/auth');

require('../../config/db/passport');

router.post('/signup', Login.SignUp);

router.patch('/signup-seller', passport.authenticate('jwt', { session: false }), Login.SignUpSeller);

router.post('/signin', passport.authenticate('local', { session: false }), Login.SignIn);

router.post('/signin-seller',auth.verifyToken, Login.SignInSeller);

module.exports = router;
