const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../Model/User/user.Model');
const Seller = require('../../Model/User/seller.Model');
const Customer = require('../../Model/User/customer.Model');
const Admin = require('../../Model/User/admin.Model');
const Role = require('../../Model/User/role.Model');
const { JWT_SECRET } = require('../../../config/index');

async function encodedToken(userID) {
    return jwt.sign({
        iss: 'Le Quang Tuan',
        sub: userID,
        iat: new Date().getTime(),
        exp: new Date().setDate(new Date().getDate() + 3)
    }, JWT_SECRET);
}

async function SignUp(req, res, next) {
    const { Fullname, Image, Address, Phone, Email, Password, Role } = req.body;

    try {
        // Check if email or phone is already registered
        const existingUser = await User.findOne({ $or: [{ Email }, { 'CustomerID.Phone': Phone }, { 'AdminID.Phone': Phone }] });
        if (existingUser) {
            return res.status(403).json({ error: { message: 'Email or Phone is already registered' } });
        }

        // Create user based on role
        let newUser;
        switch (Role) {
            case 'admin':
                newUser = new Admin({ Fullname, Image, Address, Phone });
                break;
            case 'customer':
                newUser = new Customer({ Fullname, Image, Address, Phone });
                break;
            case 'seller':
                newUser = new Seller({ Fullname, Image, Address, Phone });
                break;
            default:
                return res.status(400).json({ error: { message: 'Invalid role' } });
        }

        // Encrypt password
        if (Password) {
            const salt = await bcrypt.genSalt(10);
            const passwordHashed = await bcrypt.hash(Password, salt);
            newUser.Password = passwordHashed;
        }

        // Save user
        await newUser.save();

        // Assign role to user
        const role = await Role.findOne({ name: Role });
        const updatedUser = await User.findByIdAndUpdate(newUser._id, { [Role + 'ID']: newUser._id, Role: role._id }, { new: true });

        return res.status(201).json('Successfully registered');
    } catch (error) {
        return res.status(500).json({ error: { message: 'Internal server error' } });
    }
}

async function SignIn(req, res, next) {
    // Generate token
    const token = await encodedToken(req.user._id);
    res.setHeader('Authorization', token);
    return res.status(200).json({ success: true });
}

async function SignUpSeller(req, res, next) {
    const { Fullname, Image, Address, Phone, Role } = req.body;

    try {
        // Check if phone is already registered
        const existingSeller = await Seller.findOne({ Phone });
        if (existingSeller) {
            return res.status(403).json({ error: { message: 'Phone is already registered' } });
        }

        // Create new seller
        const newSeller = new Seller({ Fullname, Image, Address, Phone });
        await newSeller.save();

        // Update user with seller role
        const role = await Role.findOne({ name: Role });
        const updatedUser = await User.findByIdAndUpdate(req.user._id, { SellerID: newSeller._id, Role: role._id }, { new: true });

        return res.status(201).json('Successfully registered as seller');
    } catch (error) {
        return res.status(500).json({ error: { message: 'Internal server error' } });
    }
}

module.exports = {
    SignUp,
    SignIn,
    SignUpSeller
};
