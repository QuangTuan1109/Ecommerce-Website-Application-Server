const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../Model/User/user.Model');
const Seller = require('../../Model/User/seller.Model');
const Customer = require('../../Model/User/customer.Model');
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
    const { Fullname, Image, Address, Sex, Nation, DOB, ProvinceOrCity, Phone, Email, Password } = req.body;

    try {
        // Check if email or phone is already registered
        const existingUser = await User.findOne({ $or: [{ Email }, { 'CustomerID.Phone': Phone }] });
        if (existingUser) {
            return res.status(403).json({ error: { message: 'Email or Phone is already registered' } });
        }

        // Create user for customer
        const newUser = new User({ Email, Password });
        const customer = new Customer({ Fullname, Image, Address, Phone, Sex, Nation, DOB, ProvinceOrCity});
        newUser.CustomerID = customer._id;

        // Encrypt password
        if (Password) {
            const salt = await bcrypt.genSalt(10);
            const passwordHashed = await bcrypt.hash(Password, salt);
            newUser.Password = passwordHashed;
        }

        // Save user
        await newUser.save();
        await customer.save();

        // Assign role to user (default to 'customer')
        const role = await RoleModel.findOne({ name: 'customer' }); // Assuming 'customer' role exists
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
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const roleSeller = await RoleModel.findOne({ name: 'seller' });
        const roleCustomer = await RoleModel.findOne({ name: 'customer' });

        if (user.Role.includes(roleSeller._id)) {
            user.activeRole = roleCustomer._id;
            await user.save();
        }

        // Generate token
        const token = await encodedToken(req.user._id);

        return res.status(200).json({ success: true, token: token});
    } catch (error) {
        return next(error);
    }
}

async function SignUpSeller(req, res, next) {
    const { Fullname, Image, Address, Phone, EmailAddress,  } = req.body;

    try {
        const role = await RoleModel.findOne({ name: 'seller' });
        if (!role) {
            return res.status(400).json({ error: { message: 'Invalid Role' } });
        }

        const newSeller = new Seller({ Fullname, Image, Address, Phone, EmailAddress });
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
        const getToken = req.headers.authorization;
        if (!getToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(getToken, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const customerId = decodedToken.sub;
        const user = await User.findById(customerId);
        const roleSeller = await RoleModel.findOne({ name: 'seller' });

        if (user.Role.includes(roleSeller._id)) {
            user.activeRole = roleSeller._id;
            await user.save();
        } else {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
        }

        const token = await encodedToken(customerId);

        res.setHeader('Authorization', token);

        return res.status(200).json({ success: true , token, token});
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
