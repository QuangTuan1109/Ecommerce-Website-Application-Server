import express from 'express';
import passport from 'passport';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import multer from 'multer';

const upload = multer({
    dest: 'uploads/'
});

import '../config/db/passport.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import { verifyToken, isSeller } from '../config/db/auth.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import Promotion from '../app/Controller/promotion.Controller.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import userModel from '../app/Model/user.Model.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import roleModel from '../app/Model/role.Model.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`

const router = express.Router();

const isAdminOrSeller = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }

        const userId = decodedToken.sub;
        const user = await userModel.findById(mongoose.Types.ObjectId(userId));
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const role = await roleModel.findById(mongoose.Types.ObjectId(user.activeRole));
        if (!role) {
            return res.status(404).json({
                message: 'Role not found'
            });
        }

        if (role.name === 'admin' || role.name === 'seller') {
            next();
        } else {
            return res.status(403).json({
                message: 'Forbidden: You do not have permission to access this resource.'
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: 'Internal Server Error'
        });
    }
};

router.route('/add-voucher').post(verifyToken, isAdminOrSeller, Promotion.createVoucher);

router.route('/admin-voucher').get(Promotion.getAllAdminVouchers)

router.route('/get-voucher-seller/:sellerId').get(Promotion.getVoucherBySeller)

router.route('/get-voucher-detail/:voucherId').get(Promotion.getVoucherById)

router.route('/seller-voucher').get(verifyToken, isSeller, Promotion.getAllSellerVouchers)

router.route('/folower-voucher').post(verifyToken, Promotion.getAllSellerVouchersFollowedByCustomer);

router.route('/own-voucher').post(verifyToken, Promotion.getCustomerVouchers);

router.route('/:voucherID/update').patch(verifyToken, Promotion.updateVoucher)

router.route('/:voucherID/delete').delete(verifyToken, Promotion.deleteVoucher)

router.route('/:voucherID/use-voucher').post(verifyToken, Promotion.handleVoucher)

export default router;
