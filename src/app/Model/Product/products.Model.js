const mongoose = require('mongoose')
const Schema = mongoose.Schema

const productModel = new Schema({
    SellerID: {
        type: Schema.Types.ObjectId,
        ref: 'sellerModel',
        required: true
    },
    Name: {
        type: String,
        minlength: 10,
        maxlength: 120,
        required: true
    },
    Description: {
        type: String,
        maxlength: 3000
    },
    Image: [
        {
            type: String
        }
    ],
    Video: [
        {
            type: String
        }
    ],
    Category: {
        type: String
    },
    Detail: {
        type: Schema.Types.Mixed
    },
    Rating: {
        type: Number,
        default: 0
    },
    SizeTable: {
        type: Schema.Types.ObjectId,
        ref: 'sizeTableModel',
        default: null
    },
    Like: {
        type: Number,
        default: 0
    },
    Weight: Number,
    Height: Number,
    Length: Number,
    hazardousGoods: {
        type: String,
        enum: ['Yes', 'No']
    },
    deliveryFee: {
        type: [{ type: Schema.Types.ObjectId, ref: 'deliveryModel' }]
    },
    preOrderGoods: {
        type: String,
        enum: ['Yes', 'No']
    },
    Status: {
        type: String,
        enum: ['New', 'Old'],
        default: 'New'
    },
    SKU: {
        type: String
    },
    DiscountType: {
        type: String,
        enum: ['Fixed', 'Percentage'],
        default: 'Percentage'
    },
    DiscountValue: {
        type: Number,
        default: 0
    },
    CreateAt: {
        type: Date,
        default: Date.now
    },
    UpdateAt: {
        type: Date,
        default: Date.now
    },
})

module.exports = mongoose.model('productModel', productModel)