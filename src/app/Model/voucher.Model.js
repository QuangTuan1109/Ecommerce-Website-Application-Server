import mongoose from 'mongoose';

const { Schema } = mongoose;

const voucherSchema = new Schema ({
    image: {
        type: String
    },
    typeCode: {
        type: String,
        enum: ['voucher-shop', 'voucher-product', 'voucher-new-customer', 'voucher-old-customer', 'voucher-follower'],
        required: true,
    },
    nameVoucher: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['admin', 'seller'],
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        refPath: 'type',
        required: true
    },
    validFrom: {
        type: Date,
        required: true
    },
    validTo: {
        type: Date,
        required: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'amount'],
        required: true
    },
    numOfPurchases: {
        type: Number,
    },
    discountValue: {
        type: Number,
        required: true
    },
    maxReduction: {
        type: Number,
    },
    maxUsagePerUser: {
        type: Number,
        default: 1
    },
    minOrderAmount: {
        type: Number,
        required: true,
        default: 0
    },
    maxTotalUsage: {
        type: Number,
        required: true,
        default: 0
    },
    productId: [
        {
            type: Schema.Types.ObjectId,
            ref: 'productModel'
        }
    ],
    status: {
        type: String,
        enum: ['Active', 'Disabled'],
        required: true
    }
}, { timestamps: true });

export default mongoose.model('Voucher', voucherSchema);
