const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
    v4: uuidv4
} = require('uuid');
const {
    Storage
} = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');

const User = require('../Model/user.Model');
const Seller = require('../Model/seller.Model');
const Customer = require('../Model/customer.Model');
const RoleModel = require('../Model/role.Model');
const {
    JWT_SECRET
} = require('../../config/index');

const storage = new Storage({
    projectId: 'ecommerce-website-a69f9',
    keyFilename: 'C:/Users/ADMIN/Downloads/ecommerce-website-a69f9-firebase-adminsdk-9jmgt-0b36ab9a6e.json'
});

const bucketName = 'ecommerce-website-a69f9.appspot.com';
const bucket = storage.bucket(bucketName);
const storageMulter = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'C:/Users/ADMIN/Desktop/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storageMulter
}).fields([{
    name: 'Image',
    maxCount: 5
}]);

const handleFileUpload = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                error: 'File upload failed'
            });
        }
        next();
    });
};

async function handleUploadImage(req, res) {
    const imageFiles = req.files['Image'];

    const imageUrls = await Promise.all(imageFiles.map(async (imageFile) => {
        const imageName = uuidv4() + path.extname(imageFile.originalname);
        const imagePath = `images/${imageName}`;
        await bucket.upload(imageFile.path, {
            destination: imagePath
        });
        return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(imagePath)}?alt=media`;
    }));

    return res.status(200).json({
        data: imageUrls
    });
}

async function deleteFile(filePath) {
    try {
        await bucket.file(filePath).delete();
        console.log('File deleted successfully.');
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
}

async function deleteImage(req, res) {
    const imagePath = req.params.imagePath;
    try {
        await deleteFile(imagePath);
        res.status(200).json({
            message: 'Image deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            error: 'An error occurred while deleting image.'
        });
    }
}

async function encodedToken(userID) {
    return jwt.sign({
        iss: 'Le Quang Tuan',
        sub: userID,
        iat: new Date().getTime(),
        exp: new Date().setDate(new Date().getDate() + 3)
    }, JWT_SECRET);
}

async function SignUp(req, res, next) {
    const {
        Fullname,
        Image,
        Address,
        Sex,
        Nation,
        DOB,
        ProvinceOrCity,
        Phone,
        Email,
        Password
    } = req.body;

    try {
        const existingUser = await User.findOne({
            $or: [{
                Email
            }, {
                'CustomerID.Phone': Phone
            }]
        });
        if (existingUser) {
            return res.status(403).json({
                error: {
                    message: 'Email or Phone is already registered'
                }
            });
        }

        const newUser = new User({
            Email,
            Password
        });
        const customer = new Customer({
            Fullname,
            Image,
            Address,
            Phone,
            Sex,
            Nation,
            DOB,
            ProvinceOrCity
        });
        newUser.CustomerID = customer._id;

        if (Password) {
            const salt = await bcrypt.genSalt(10);
            const passwordHashed = await bcrypt.hash(Password, salt);
            newUser.Password = passwordHashed;
        }

        await newUser.save();
        await customer.save();

        const role = await RoleModel.findOne({
            name: 'customer'
        });
        newUser.Role.push(role._id);
        await newUser.save();

        return res.status(201).json('Successfully registered');
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            error: {
                message: 'Internal server error'
            }
        });
    }
}

async function SignIn(req, res, next) {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const roleSeller = await RoleModel.findOne({
            name: 'seller'
        });
        const roleCustomer = await RoleModel.findOne({
            name: 'customer'
        });

        if (user.Role.includes(roleSeller._id)) {
            user.activeRole = roleCustomer._id;
            await user.save();
        }

        // Generate token
        const token = await encodedToken(req.user._id);

        return res.status(200).json({
            success: true,
            token: token
        });
    } catch (error) {
        return next(error);
    }
}

async function SignUpSeller(req, res, next) {
    const {
        Fullname,
        Image,
        Address,
        Phone,
        EmailAddress,
    } = req.body;

    try {
        const role = await RoleModel.findOne({
            name: 'seller'
        });
        if (!role) {
            return res.status(400).json({
                error: {
                    message: 'Invalid Role'
                }
            });
        }

        const newSeller = new Seller({
            Fullname,
            Image,
            Address,
            Phone,
            EmailAddress
        });
        await newSeller.save();

        await User.findByIdAndUpdate(req.user._id, {
            $push: {
                Role: role._id
            },
            SellerID: newSeller._id
        }, {
            new: true
        });

        return res.status(201).json('Successfully registered as seller');
    } catch (error) {
        console.error('Error in SignUpSeller:', error);
        return res.status(500).json({
            error: {
                message: 'Internal server error'
            }
        });
    }
}

async function SignInSeller(req, res, next) {
    try {
        const getToken = req.headers.authorization;
        if (!getToken) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }

        const decodedToken = jwt.verify(getToken, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }

        const customerId = decodedToken.sub;
        const user = await User.findById(customerId);
        const roleSeller = await RoleModel.findOne({
            name: 'seller'
        });

        if (user.Role.includes(roleSeller._id)) {
            user.activeRole = roleSeller._id;
            await user.save();
        } else {
            return res.status(403).json({
                message: 'Forbidden: You do not have permission to access this resource.'
            });
        }

        const token = await encodedToken(customerId);

        res.setHeader('Authorization', token);

        return res.status(200).json({
            success: true,
            token,
            token
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    deleteImage,
    handleUploadImage,
    handleFileUpload,
    SignUp,
    SignIn,
    SignUpSeller,
    SignInSeller
};