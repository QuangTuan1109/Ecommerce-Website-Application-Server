const jwt = require('jsonwebtoken')

const User = require('../../Model/User/user.Model');
const Seller = require('../../Model/User/seller.Model');
const Customer = require('../../Model/User/customer.Model');
const Admin = require('../../Model/User/admin.Model');
const db = require('../../Model/indexModel')
const ROLES = db.ROLES;
const Roles = require('../../Model/User/role.Model')
const { JWT_SECRET } = require('../../../config/index');
const { token } = require('morgan');

// Create TOKEN
function encodedToken(userID) {
    return jwt.sign({
        iss: 'Le Quang Tuan',
        sub: userID,
        iat: new Date().getTime(),
        exp: new Date().setDate(new Date().getDate() + 3)
    }, JWT_SECRET)
}

// API SIGN UP
async function SignUp(req, res, next) {
    const {AdminID, SellerID, CustomerID, Fullname, Image, Address, Phone, Role, Email, Password } = req.body

    //Check email already or not.
    const foundUser = await User.findOne({ Email })
    if (foundUser) {
        return res.status(403).json({ error: { message: 'Email is already!!' } })
    }

    //Check Phone already or not.
    const CheckPhoneCustommer = await Customer.findOne({ Phone })
    if (CheckPhoneCustommer) {
        return res.status(403).json({ error: { message: 'Phone is registed!!' } })
    }

    const CheckPhoneAdmin = await Admin.findOne({ Phone })
    if (CheckPhoneAdmin) {
        return res.status(403).json({ error: { message: 'Phone is registed!!' } })
    }

    //Create new user.
    const newUser = new User({AdminID, SellerID, CustomerID, Email, Password, Role })
    const newCustomer = new Customer({ Fullname, Image, Address, Phone})
    const newAdmin = new Admin({ Fullname, Image, Address, Phone})

    // Create admin and customer account
    if (req.body.Role) {
        Roles.find({
            name: req.body.Role
        }, (err, role) => {
            if (err) {
                res.status(500).json({
                    message: err
                })
                return
            } else {
                switch (role[0].name) {
                    case 'admin':
                        newAdmin.save()

                        newUser.AdminID = newAdmin._id;
                        newUser.SellerID = null;
                        newUser.CustomerID = null;
                        newUser.Role = role[0]._id
                        newUser.save()
                        break;
                            
                    default:
                        newCustomer.save()

                        newUser.AdminID = null;
                        newUser.SellerID = null;
                        newUser.CustomerID = newCustomer._id;
                        newUser.Role = role[0]._id
                        newUser.save()
                        break;
                }
            }
        })
    }

    return res.status(201).json('Successfully!!')
}

// API SIGN IN WITH LOCAL ACCOUNT
async function SignIn(req, res, next) {
    //Assign token
    const token = await encodedToken(req.user._id)

    res.setHeader('Authorization', token)

    return res.status(200).json({success: true})
}

// API SIGN UP SELLER
async function SignUpSeller(req, res, next) {
    const {Fullname, Image, Address, Phone} = req.body

    // Check phone
    const CheckPhoneSeller = await Seller.findOne({ Phone })
    if (CheckPhoneSeller) {
        return res.status(403).json({ error: { message: 'Phone is registed!!' } })
    }

    //Create new seller.
    const newSeller = new Seller({ Fullname, Image, Address, Phone})

    // Create seller account
    if (req.body.Role) {
        Roles.find({
            name: req.body.Role
        }, (err, role) => {
            if (err) {
                res.status(500).json({
                    message: err
                })
                return
            } else {
                const token = req.header('Authorization').split(' ')
                const verifytoken = jwt.verify(token[1], process.env.JWT_SECRET)
                try {
                    User.findOne({_id: verifytoken.sub}, async (err, result) => {
                        if (err) {
                            res.status(500).json({
                                message: err
                            })
                            return
                        } else {
                            if (role[0].name == 'seller' 
                                && result.Role != role[0]._id.toString() 
                                && result.Role.length == 1) {
                                    newSeller.save()
                                    await User.updateOne({_id: result._id}, 
                                        {
                                            $set: {
                                                SellerID : newSeller._id,
                                                Role : [result.Role[0], role[0]._id]
                                            }
                                        })
                                return res.status(201).json('Successfully!!')
                            } else {
                                return res.status(403).json('Registed!!')
                            }
                        }
                    })
                } catch (error) {
                    
                }
            }
        })
    }
}

module.exports = {
    SignUp,
    SignIn,
    SignUpSeller
}