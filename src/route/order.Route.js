import express from 'express';
import passport from 'passport';
import '../config/db/passport.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import { verifyToken } from '../config/db/auth.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import Cart from '../app/Controller/order.Controller.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`

const router = express.Router();

router.route('/:ProductID/add-to-cart').post(verifyToken, Cart.addToCart);

router.route('/cart').get(verifyToken, Cart.getCart);

router.route('/cart/:productId').delete(verifyToken, Cart.deleteProductInCart);

router.route('/order-and-payment').post(verifyToken, Cart.order);

router.route('/get-order').get(verifyToken, Cart.getOrdersByCustomer);

router.route('/:sellerId').get(verifyToken, Cart.getOrderBySeller);

router.route('/cancel-order').post(verifyToken, Cart.cancelOrder);

router.route('/confirm-order-successfully').post(verifyToken, Cart.confirmOrderByCustomer);

router.route('/confirm-return').post(verifyToken, Cart.ReturnOrder);

router.route('/confirm-order').post(verifyToken, Cart.confirmOrderBySeller);

router.route('/confirm-shipped-order').post(verifyToken, Cart.shippingOrderBySeller);

router.route('/approve-return').post(verifyToken, Cart.approveReturn);

router.route('/reject-return').post(verifyToken, Cart.rejectReturn);

export default router;
