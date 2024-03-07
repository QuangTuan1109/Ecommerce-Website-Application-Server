const jwt = require('jsonwebtoken');
const mongoose = require('mongoose')
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');



const User = require('../../Model/User/user.Model')
const Product = require('../../Model/Product/products.Model')
const Voucher = require('../../Model/Promotion/voucher.Model')
const sellerModel = require('../../Model/User/seller.Model');
const roleModel = require('../../Model/User/role.Model');
const Admin = require('../../Model/User/admin.Model');
const customerModel = require('../../Model/User/customer.Model');


const storage = new Storage({
    projectId: 'ecommerce-website-a69f9',
    keyFilename: 'C:/Users/ADMIN/Downloads/ecommerce-website-a69f9-firebase-adminsdk-9jmgt-0b36ab9a6e.json'
});

const bucketName = 'ecommerce-website-a69f9.appspot.com';
const bucket = storage.bucket(bucketName);

const storageMulter = multer.memoryStorage();

const upload = multer({ storage: storageMulter }).single('image');
  
const createVoucher = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(mongoose.Types.ObjectId(decodedToken.sub));
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let createdBy;
        const role = await roleModel.findById(mongoose.Types.ObjectId(user.activeRole));
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }
        if (role.name === 'seller') {
            const seller = await sellerModel.findById(mongoose.Types.ObjectId(user.SellerID));
            if (!seller) {
                return res.status(404).json({ message: 'Seller not found' });
            }
            createdBy = seller._id;
        } else {
            const admin = await Admin.findById(mongoose.Types.ObjectId(user.AdminID));
            if (!admin) {
                return res.status(404).json({ message: 'Admin not found' });
            }
            createdBy = admin._id;
        }

        if (req.body.productId) {
            const sellerProducts = await Product.find({ SellerID: user.SellerID });
            if (!sellerProducts) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const providedProductIds = req.body.productId;
            for (const productId of providedProductIds) {
                const product = sellerProducts.find(product => product._id.toString() === productId);
                if (!product) {
                    return res.status(403).json({ message: 'Forbidden: Some products do not belong to you.' });
                }
            }
        }

        const imageFile = req.file;
        if (!imageFile) {
            return res.status(400).json({ message: 'Image file is required.' });
        }
        const imageName = imageFile.originalname;
        const imageUploadPath = `vouchers/${imageName}`;
        const file = bucket.file(imageUploadPath);
        const uploadStream = file.createWriteStream({
            metadata: {
                contentType: imageFile.mimetype
            }
        });
        uploadStream.on('error', (error) => {
            console.error(error);
            return res.status(500).json({ message: 'Error uploading image' });
        });
        uploadStream.on('finish', async () => {
            const imageUrl = `https://storage.googleapis.com/${bucket.name}/${imageUploadPath}`;
            const newVoucher = new Voucher({
                code: req.body.code,
                type: role.name,
                createdBy,
                validFrom: req.body.validFrom,
                validTo: req.body.validTo,
                discountType: req.body.discountType,
                discountValue: req.body.discountValue,
                maxUsagePerUser: req.body.maxUsagePerUser,
                minOrderAmount: req.body.minOrderAmount,
                target: req.body.target,
                productId: req.body.productId,
                categoryId: req.body.categoryId,
                image: imageUrl
            });
            try {
                await newVoucher.save();
                res.status(201).json('Successfully created voucher');
            } catch (error) {
                return res.status(500).json({ message: 'Error saving voucher to database' });
            }
        });
        uploadStream.end(imageFile.buffer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getAllAdminVouchers = async (req, res) => {
    try {
        const adminVouchers = await Voucher.find({ type: 'admin' });
        res.status(200).json(adminVouchers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllSellerVouchersFollowedByCustomer = async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const customerId = decodedToken.sub;

        const customer = await customerModel.findById(mongoose.Types.ObjectId(customerId));
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const sellerIds = customer.Following; // Lấy danh sách ID của các Seller mà customer đã follow
        const sellerVouchers = await Voucher.find({ type: 'seller', createdBy: { $in: sellerIds } });
        res.status(200).json(sellerVouchers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getCustomerVouchers = async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const customerId = decodedToken.sub;

        const customer = await customerModel.findById(mongoose.Types.ObjectId(customerId));
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const customerVouchers = [];
        for (const usage of customer.usageHistory) {
            const voucher = await Voucher.findById(usage.voucherId);
            if (voucher) {
                customerVouchers.push(voucher);
            }
        }

        res.status(200).json(customerVouchers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateVoucher = async (req, res) => {
    try {
        const voucherId = req.params.voucherID;
        const updates = req.body;

        const updatedVoucher = await Voucher.findByIdAndUpdate(voucherId, updates, { new: true });

        if (!updatedVoucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        res.status(200).json(updatedVoucher);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteVoucher = async (req, res) => {
    try {
        const { voucherId } = req.params;

        const voucher = await Voucher.findById(voucherId);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        await voucher.remove();

        res.status(200).json({ message: 'Voucher deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const useVoucher = async (req, res) => {
    try {
        const { voucherID } = req.params;

        const voucher = await Voucher.findById(voucherID);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        const token = req.headers.authorization;
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(mongoose.Types.ObjectId(decodedToken.sub));
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const customer = await customerModel.findOne({_id: user.CustomerID});
        if (!customer) {
            return res.status(404).json({ message: 'Forbidden: Only customers can use vouchers' });
        }

        const ownedVoucher = customer.usageHistory.find(entry => entry.voucherId.toString() === voucherID);
        if (!ownedVoucher) {
            return res.status(403).json({ message: 'Forbidden: Customer does not own this voucher' });
        }

        if (ownedVoucher.currentUsage >= voucher.maxUsagePerUser) {
            return res.status(403).json({ message: 'Forbidden: Maximum usage limit reached for this voucher' });
        }

        ownedVoucher.currentUsage += 1;
        await customer.save();

        res.status(200).json({ message: 'Voucher used successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


module.exports = {
    createVoucher,
    getAllAdminVouchers,
    getAllSellerVouchersFollowedByCustomer,
    getCustomerVouchers,
    updateVoucher,
    deleteVoucher,
    useVoucher
};
