const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    products: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'productModel',
            required: true
        },
        classifyDetail: {
            type: Object
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    }],
    totalProductPrice: {
        type: Number,
        required: true
    },
    voucher: {
        type: Schema.Types.ObjectId,
        ref: 'Voucher',
        default: null
    },  
    deliveryMethod: {
        type: Schema.Types.ObjectId,
        ref: 'Delivery',
        default: null
    },
    deliveryFee: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    message: String,
    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    shippingAddress: {
        type: Schema.Types.ObjectId,
        ref: 'shippingAddressSchema'
    },
    paymentMethod: {
        type: Schema.Types.ObjectId,
        ref: 'paymentMethodSchema'
    },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);