const express = require('express');
const router = require('express-promise-router')();
const passport = require('passport');

require('../config/db/passport');
const auth = require('../config/db/auth');
const Cart = require('../app/Controller/order.Controller');

router.route('/:ProductID/add-to-cart').post(auth.verifyToken, Cart.addToCart);

router.route('/cart').get(auth.verifyToken, Cart.getCart)

router.route('/cart/:productId').delete(auth.verifyToken, Cart.deleteProductInCart)

router.route('/order-and-payment').post(auth.verifyToken, Cart.order);

router.route('/get-order').get(auth.verifyToken, Cart.getOrdersByCustomer);

router.route('/:sellerId').get(auth.verifyToken, Cart.getOrderBySeller);

router.route('/cancel-order').post(auth.verifyToken, Cart.cancelOrder);

router.route('/confirm-order-successfully').post(auth.verifyToken, Cart.confirmOrderByCustomer);

router.route('/confirm-return').post(auth.verifyToken, Cart.ReturnOrder);

router.route('/confirm-order').post(auth.verifyToken, Cart.confirmOrderBySeller);

router.route('/confirm-shipped-order').post(auth.verifyToken, Cart.shippingOrderBySeller);

router.route('/approve-return').post(auth.verifyToken, Cart.approveReturn);

router.route('/reject-return').post(auth.verifyToken, Cart.rejectReturn);

module.exports = router;