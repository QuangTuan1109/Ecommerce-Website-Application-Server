const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const customerSchema = new Schema ({
    Fullname : {
        type: String,
        maxlength: 30,
        required: true
    },
    Image : {
        type: String
    },
    Address : {
        type: String
    },
    Phone : {
        type: String,
        unique: true,
        required: true
    },
    DOB : {
        type: Date,
        require: true
    },
    Sex : {
        type: String,
        require: true
    },
    Nation : {
        type: String,
    },
    ProvinceOrCity : {
        type: String,
    },
    Following : [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    Follower : [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    Wishlist: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }],
    usageHistory: [{
        voucherId: {
            type: Schema.Types.ObjectId,
            ref: 'Voucher'
        },
        currentUsage: {
            type: Number,
            default: 0
        }
    }],
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
