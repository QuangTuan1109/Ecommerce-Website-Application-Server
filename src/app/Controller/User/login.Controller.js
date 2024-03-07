const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../Model/User/user.Model');
const Seller = require('../../Model/User/seller.Model');
const Customer = require('../../Model/User/customer.Model');
const Admin = require('../../Model/User/admin.Model');
const RoleModel = require('../../Model/User/role.Model');
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
                newUser = new User({ Email, Password });
                const admin = new Admin({ Fullname, Image, Address, Phone });
                newUser.AdminID = admin._id;
                admin.save();
                break;
            case 'customer':
                newUser = new User({ Email, Password });
                const customer = new Customer({ Fullname, Image, Address, Phone });
                newUser.CustomerID = customer._id;
                customer.save();
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
        const role = await RoleModel.findOne({ name: Role });
        newUser.Role.push(role._id);
        await newUser.save();

        return res.status(201).json('Successfully registered');
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: { message: 'Internal server error' } });
    }
}

async function SignIn(req, res, next) {
    try {
        const user = await User.findById(req.user._id);
        const roleSeller = await RoleModel.findOne({ name: 'seller' });
        const roleCustomer = await RoleModel.findOne({ name: 'customer' });
        if (user.Role.includes(roleSeller._id)) {
            user.activeRole = roleCustomer._id;
            await user.save();
        }

        // Generate token
        const token = await encodedToken(req.user._id);

        res.setHeader('Authorization', token);

        return res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
}

async function SignUpSeller(req, res, next) {
    const { Fullname, Image, Address, Phone, Role } = req.body;

    try {
        const role = await RoleModel.findOne({ name: Role });
        if (!role) {
            return res.status(400).json({ error: { message: 'Invalid Role' } });
        }

        const newSeller = new Seller({ Fullname, Image, Address, Phone });
        await newSeller.save();

        await User.findByIdAndUpdate(req.user._id, 
            { 
                $push: { Role: role._id },
                SellerID: newSeller._id 
            }, { new: true });

        return res.status(201).json('Successfully registered as seller');
    } catch (error) {
        console.error('Error in SignUpSeller:', error);
        return res.status(500).json({ error: { message: 'Internal server error' } });
    }
}

async function SignInSeller(req, res, next) {
    try {
        const user = await User.findById(req.user._id);
        const roleSeller = await RoleModel.findOne({ name: 'seller' });
        if (user.Role.includes(roleSeller._id)) {
            user.activeRole = roleSeller._id;
            await user.save();
        } else {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
        }

        const token = await encodedToken(req.user._id);

        res.setHeader('Authorization', token);

        return res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    SignUp,
    SignIn,
    SignUpSeller,
    SignInSeller
};
