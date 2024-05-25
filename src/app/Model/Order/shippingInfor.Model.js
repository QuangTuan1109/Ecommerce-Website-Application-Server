const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const shippingAddressSchema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    addressType: {
        type: String,
        enum: ['Công ty', 'Văn phòng', 'Nhà riêng']
    },
    province: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    ward: {
        type: String
    },
    address: {
        type: String,
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('shippingAddressSchema', shippingAddressSchema);