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
const ImageModel = require('../../Model/image')

async function checkVoucherEligibility(customerId, productIds, voucherCode) {
    const customer = await customerModel.findById(customerId).populate('Wishlist usageHistory.voucherId');
    const voucher = await Voucher.findOne({ code: voucherCode });
    if (!customer || !voucher) {
        throw new Error('Invalid customer or voucher.');
    }

    // Tổng số tiền của các sản phẩm
    const products = await Product.find({ _id: { $in: productIds } });
    const totalAmount = products.reduce((acc, product) => acc + product.Price, 0);

    // 1. Kiểm tra giá trị đơn hàng tối thiểu
    if (totalAmount < voucher.minOrderAmount) {
        return { eligible: false, message: 'Order amount is less than minimum order amount.' };
    }

    // 2. Kiểm tra số lần sử dụng tối đa của người dùng
    const voucherUsage = customer.usageHistory.find(v => v.voucherId.toString() === voucher._id.toString());
    if (voucherUsage && voucherUsage.currentUsage >= voucher.maxUsagePerUser) {
        return { eligible: false, message: 'Voucher usage limit per user exceeded.' };
    }

    // 3. Kiểm tra thời hạn sử dụng
    const now = new Date();
    if (now < voucher.validFrom || now > voucher.validTo) {
        return { eligible: false, message: 'Voucher is not valid at this time.' };
    }

    // 4. Kiểm tra typeCode
    const usedTypeCodes = customer.usageHistory
        .filter(uh => productIds.includes(uh.voucherId.toString()))
        .map(uh => uh.voucherId.typeCode);
    if (usedTypeCodes.includes(voucher.typeCode)) {
        return { eligible: false, message: `Voucher of type ${voucher.typeCode} has already been used.` };
    }

    // 5. Kiểm tra tổng số lần sử dụng voucher
    const totalUsage = await customerModel.countDocuments({ 'usageHistory.voucherId': voucher._id });
    if (totalUsage >= voucher.maxTotalUsage) {
        return { eligible: false, message: 'Voucher total usage limit exceeded.' };
    }

    // 6. Kiểm tra mục đích sử dụng
    if (voucher.typeCode === 'voucher-new-customer' && customer.Wishlist.length > 0) {
        return { eligible: false, message: 'Only new customers can use this voucher.' };
    }

    if (voucher.typeCode === 'voucher-old-customer' && customer.Wishlist.length < voucher.numOfPurchases) {
        return { eligible: false, message: `Customers must have made at least ${voucher.numOfPurchases} purchases to use this voucher.` };
    }

    if (voucher.typeCode === 'voucher-follower' && !customer.Following.includes(voucher.createdBy)) {
        return { eligible: false, message: 'Only followers can use this voucher.' };
    }

    return { eligible: true, message: 'Voucher is valid.' };
}

  
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
            if (!sellerProducts || sellerProducts.length === 0) {
                return res.status(404).json({ message: 'Products not found' });
            }

            const providedProductIds = req.body.productId;
            for (const productId of providedProductIds) {
                const product = sellerProducts.find(product => product._id.toString() === productId);
                if (!product) {
                    return res.status(403).json({ message: 'Forbidden: Some products do not belong to you.' });
                }
            }
        }

        const imageUrl = await ImageModel.findOne({ name: req.body.typeCode });
        if (!imageUrl) {
            return res.status(404).json({ message: 'Image not found' });
        }

        const validFrom = new Date(req.body.validFrom);
        const validTo = new Date(req.body.validTo);
        const today = new Date();
        
        if (validFrom > validTo) {
            res.status(400).json({message: 'Invalid Time'})
        }
        let status;
        if (validFrom <= today && today <= validTo) {
            status = 'Active';
        } else if (validFrom > today || validTo < today) {
            status = 'Disabled';
        } else {
            status = 'Inactive'; 
        }

        const newVoucher = new Voucher({
            image: imageUrl.image,
            typeCode: req.body.typeCode,
            nameVoucher: req.body.nameVoucher,
            code: req.body.code,
            type: role.name,
            createdBy,
            validFrom,
            validTo,
            discountType: req.body.discountType,
            discountValue: req.body.discountValue,
            numOfPurchases: req.body.numOfPurchases,
            maxReduction: req.body.maxReduction,
            maxUsagePerUser: req.body.maxUsagePerUser,
            minOrderAmount: req.body.minOrderAmount,
            maxTotalUsage: req.body.maxTotalUsage,
            productId: req.body.productId,
            status
        });

        await newVoucher.save();
        res.status(201).json('Successfully created voucher');
    } catch (error) {
        console.error(error);
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

const getVoucherBySeller = async (req, res) => {
    try {
        const { sellerId } = req.params;

        const foundVouchers = await Voucher.find({ createdBy: mongoose.Types.ObjectId(sellerId) });

        if (foundVouchers.length === 0) {
            return res.status(404).json({ message: 'Seller does not have any vouchers!' });
        }

        res.status(200).json({ data: foundVouchers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while fetching vouchers.' });
    }
};

const getAllSellerVouchers = async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userID = decodedToken.sub;
        const foundUser = await User.findById({ _id: mongoose.Types.ObjectId(userID) });
        const roleSeller = await roleModel.findOne({ name: 'seller' });

        if (!foundUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!foundUser.activeRole.equals(roleSeller._id)) {
            return res.status(403).json({ error: 'User is not a seller' });
        }

        const foundSeller = await sellerModel.findById({ _id: foundUser.SellerID });
        if (!foundSeller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        const sellerVouchers = await Voucher.find({ createdBy: foundSeller._id });
        res.status(200).json({data: sellerVouchers});
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
const handleVoucher = async (req, res) => {
    try {
        const { voucherID } = req.params;
        const { action } = req.body;

        // Verify if the voucher exists
        const voucher = await Voucher.findById(voucherID);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        // Verify the token and get the user
        const token = req.headers.authorization;
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(mongoose.Types.ObjectId(decodedToken.sub));
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const customer = await customerModel.findOne({ _id: user.CustomerID });
        if (!customer) {
            return res.status(404).json({ message: 'Forbidden: Only customers can use vouchers' });
        }

        // Find the voucher in the customer's usage history
        let ownedVoucher = customer.usageHistory.find(entry => entry.voucherId.toString() === voucherID);
        
        if (action === 'use') {
            if (!ownedVoucher) {
                ownedVoucher = {
                    voucherId: voucherID,
                    currentUsage: 1
                };
                customer.usageHistory.push(ownedVoucher);
            } else if (ownedVoucher.currentUsage >= voucher.maxUsagePerUser) {
                return res.status(403).json({ message: 'Forbidden: Maximum usage limit reached for this voucher' });
            } else {
                ownedVoucher.currentUsage += 1;
            }
        } else if (action === 'cancel') {
            if (ownedVoucher.currentUsage > 0) {
                ownedVoucher.currentUsage -= 1;
            }
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }
        
        //console.log(customer)
        await customer.save();
        return res.status(200).json({ message: `Voucher ${action}d successfully` });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


module.exports = {
    createVoucher,
    getVoucherBySeller,
    getAllAdminVouchers,
    getAllSellerVouchers,
    getAllSellerVouchersFollowedByCustomer,
    getCustomerVouchers,
    updateVoucher,
    deleteVoucher,
    handleVoucher
};
