import User from '../Model/user.Model.js';
import Customer from '../Model/customer.Model.js';
import Seller from '../Model/seller.Model.js';
import jwt from 'jsonwebtoken';
// import db from '../../Model';
// const ROLES = db.ROLES;
import Role from '../Model/role.Model.js';
import mongoose from 'mongoose';

const getUserInfo = async (req, res, next) => {
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
        const user = await User.findById(mongoose.Types.ObjectId(userId))
            .populate('activeRole')
            .populate('CustomerID')
            .populate('SellerID');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ user: user });
    } catch (error) {
        return next(error);
    }
}

export default getUserInfo