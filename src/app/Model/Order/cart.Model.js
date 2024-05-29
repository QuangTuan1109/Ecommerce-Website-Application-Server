const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartModel = new Schema({
    CustomerID: {
        type: Schema.Types.ObjectId,
        ref: 'Customer'
    },
    ProductID: {
        type: Schema.Types.ObjectId,
        ref: 'productModel'
    },
    classifyDetail: {
        type: Object
    },
    Quantity: {
        type: Number
    },
    TotalPrices: {
        type: Number
    },
    Voucher: {
        type: Schema.Types.ObjectId,
        ref: 'Voucher',
        default: null
    },
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartModel);
