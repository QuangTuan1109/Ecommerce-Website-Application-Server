const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sellerSchema = new Schema ({
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
    EmailAddress : {
        type: String
    },
    Phone : {
        type: String,
        unique: true,
        required: true
    },
    Following : [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    Follower : [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    Vouchers: [{
        type: Schema.Types.ObjectId,
        ref: 'Voucher'
    }],
    DeliveryMethod: [{
        type: Schema.Types.ObjectId,
        ref: 'deliveryModel'
    }],
}, { timestamps: true });

module.exports = mongoose.model('Seller', sellerSchema);
