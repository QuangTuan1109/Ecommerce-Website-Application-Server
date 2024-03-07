const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentMethodSchema = new Schema({
    customerID: {
        type: Schema.Types.ObjectId,
        ref: 'Customer'
    },
    methodType: {
        type: String,
        enum: ['Credit/Debit Card', 'Cash on Delivery']
    },
    cardNumber: {
        type: String,
    },
    expiryDate: {
        type: Date,
    },
    cvv: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);