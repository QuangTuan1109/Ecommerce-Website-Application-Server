const express = require('express')
const router = express.Router();
const auth = require('../config/db/auth');

const userController = require('../app/Controller/user.Controller');

router.get('/', auth.verifyToken, userController.getUserInfor);

module.exports = router