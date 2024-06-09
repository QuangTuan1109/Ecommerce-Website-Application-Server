const express = require('express');
const router = require('express-promise-router')();
const passport = require('passport');

require('../config/db/passport');
const auth = require('../config/db/auth');
const imageController = require('../app/Controller/imageController');

router.route('/add-image').post( imageController.AddImage); 

module.exports = router;
