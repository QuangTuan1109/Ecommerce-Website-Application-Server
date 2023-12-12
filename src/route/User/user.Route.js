const express = require('express')
const router = require('express-promise-router')()

const userController = require('../../app/Controller/User/user.Controller');

router.route('/a', userController);

module.exports = router