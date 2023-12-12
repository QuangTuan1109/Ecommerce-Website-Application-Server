const express = require('express')
const router = require('express-promise-router')()
const passport = require('passport')

require('../../config/db/passport')
const Login = require('../../app/Controller/User/login.Controller')

router.route('/signup').post(Login.SignUp);

router.route('/signup-seller').post(passport.authenticate('jwt', {session: false}), Login.SignUpSeller);

router.route('/signin').post(passport.authenticate('local', {session: false}), Login.SignIn);

module.exports = router