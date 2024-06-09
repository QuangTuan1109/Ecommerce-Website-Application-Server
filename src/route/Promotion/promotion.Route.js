const express = require('express');
const router = require('express-promise-router')();
const passport = require('passport');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

require('../../config/db/passport');
const auth = require('../../config/db/auth');
const Promotion = require('../../app/Controller/Promotion/promotion.Controller');
const userModel = require('../../app/Model/User/user.Model');
const roleModel = require('../../app/Model/User/role.Model');

const isAdminOrSeller = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const userId = decodedToken.sub;
        const user = await userModel.findById(mongoose.Types.ObjectId(userId));
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const role = await roleModel.findById(mongoose.Types.ObjectId(user.activeRole));
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        if (role.name === 'admin' || role.name === 'seller') {
            next();
        } else {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};


router.route('/add-voucher').post(auth.verifyToken, isAdminOrSeller, Promotion.createVoucher);

router.route('/admin-voucher').get(Promotion.getAllAdminVouchers)

router.route('/get-voucher-seller/:sellerId').get(Promotion.getVoucherBySeller)

router.route('/seller-voucher').get(auth.verifyToken, auth.isSeller, Promotion.getAllSellerVouchers)

router.route('/folower-voucher').post(auth.verifyToken, Promotion.getAllSellerVouchersFollowedByCustomer);

router.route('/own-voucher').post(auth.verifyToken, Promotion.getCustomerVouchers);

router.route('/:voucherID/update').patch(auth.verifyToken, isAdminOrSeller, Promotion.updateVoucher)

router.route('/:voucherID/delete').delete(auth.verifyToken, isAdminOrSeller, Promotion.deleteVoucher)

router.route('/:voucherID/use-voucher').post(auth.verifyToken, Promotion.handleVoucher)

module.exports = router;
