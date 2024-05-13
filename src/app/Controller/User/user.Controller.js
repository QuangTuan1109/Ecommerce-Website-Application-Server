const User = require('../../Model/User/user.Model');
const Customer = require('../../Model/User/customer.Model')
const Seller = require('../../Model/User/seller.Model')
const jwt = require('jsonwebtoken');
// const db = require('../../Model')
// const ROLES = db.ROLES;
const Roles = require('../../Model/User/role.Model')

async function getUserInfor(req, res, next) {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = decodedToken.sub
        const user = await User.findById(userId)
        .populate('activeRole')
        .populate('CustomerID')
        .populate('SellerID')

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({user: user})
    } catch (error) {
        return next(error);
    }
}

module.exports= {
    getUserInfor
}