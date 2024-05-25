const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const voucherSchema = new Schema ({
    image: {
        type: String
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
        enum: ['percentage', 'fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
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
    target: {
        type: String,
        enum: ['SpecificProduct', 'ProductCategory', 'MinOrderAmount', 'AllProducts'],
        required: true
    },
    productId: [
        {
            type: Schema.Types.ObjectId,
            ref: 'productModel'
        }
    ],
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'Category'
    },
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);
