import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Storage } from '@google-cloud/storage';
import multer from 'multer';

import User from '../Model/user.Model.js';
import productModel from '../Model/products.Model.js';
import Voucher from '../Model/voucher.Model.js';
import Seller from '../Model/seller.Model.js';
import Role from '../Model/role.Model.js';
import Admin from '../Model/admin.Model.js';
import Customer from '../Model/customer.Model.js';
import Images from '../Model/image.js';

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
        const role = await Role.findById(mongoose.Types.ObjectId(user.activeRole));
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        if (role.name === 'seller') {
            const seller = await Seller.findById(mongoose.Types.ObjectId(user.SellerID));
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
            const sellerProducts = await productModel.find({ SellerID: user.SellerID });
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

        const imageUrl = await Images.findOne({ name: req.body.typeCode });
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
        const roleSeller = await Role.findOne({ name: 'seller' });

        if (!foundUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!foundUser.activeRole.equals(roleSeller._id)) {
            return res.status(403).json({ error: 'User is not a seller' });
        }

        const foundSeller = await Seller.findById({ _id: foundUser.SellerID });
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

        const customer = await Customer.findById(mongoose.Types.ObjectId(customerId));
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

        const customer = await Customer.findById(mongoose.Types.ObjectId(customerId));
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

        const customer = await Customer.findOne({ _id: user.CustomerID });
        if (!customer) {
            return res.status(404).json({ message: 'Forbidden: Only customers can use vouchers' });
        }

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
        
        await customer.save();
        return res.status(200).json({ message: `Voucher ${action}d successfully` });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export default {
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
