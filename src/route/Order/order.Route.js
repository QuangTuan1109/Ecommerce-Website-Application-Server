const express = require('express');
const router = require('express-promise-router')();
const passport = require('passport');

require('../../config/db/passport');
const auth = require('../../config/db/auth');
const Cart = require('../../app/Controller/Order/order.Controller');

router.route('/:ProductID/add-to-cart').post(auth.verifyToken, Cart.addToCart);

router.route('/cart').get(auth.verifyToken, Cart.getCart)

router.route('/order-and-payment').post(auth.verifyToken, Cart.order);

module.exports = router;
