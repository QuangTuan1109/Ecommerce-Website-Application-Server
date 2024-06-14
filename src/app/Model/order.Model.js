import mongoose from 'mongoose';

const { Schema } = mongoose;

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
        },
        message: String,
        voucherShop: [{
            type: Schema.Types.ObjectId,
            ref: 'Voucher',
            default: null
        }],  
        deliveryMethod: {
            type: String,
            required: true,
            default: null
        },
        deliveryFee: {
            type: Number,
            required: true
        },
        productStatus: {
            type: String,
            enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Completed', 'Cancelled', 'Return/Refund', 'Delivery failed'],
            default: 'Pending'
        },
        returnRequest: {
            type: Boolean,
            default: false
        },
        returnReason: {
            type: String,
            default: ''
        },
        returnStatus: {
            type: String,
            enum: [null, 'Pending', 'Approved', 'Rejected'],
            default: null
        },
        returnOrderStatus: {
            type: String,
            enum: [null, 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Completed', 'Failed'],
            default: null
        },
        returnRequestedBy: {
            type: String,
            enum: [null, 'customer', 'seller', 'admin'],
            default: null
        },
        confirmationTime: {
            type: Date
        }
    }],
    voucherSystem: [{
        type: Schema.Types.ObjectId,
        ref: 'Voucher',
        default: null
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Completed', 'Cancelled', 'Return/Refund', 'Partial Return/Refund', 'Delivery failed'],
        default: 'Pending'
    },
    recipName: {
        type: String,
        required: true
    },
    shippingAddress: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    bankTransferImage: [
        {
            type: String
        }
    ],
    cancelRequest: {
        type: Boolean,
        default: false
    },
    cancelledBy: {
        type: String,
        enum: [null, 'customer', 'seller', 'admin'],
        default: null
    },
    createdDate: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Order', orderSchema);
