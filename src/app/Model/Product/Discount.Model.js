const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DiscountModel = new Schema({
    ProductID: {
        type: Schema.Types.ObjectId,
        ref: 'productModel'
    },
    Value: [{
        From: {
            type: Number,
            required: true
        },
        To: {
            type: Number,
            required: true
        },
        UnitPrice: {
            type: Number,
            required: true
        },
    }],
    CreateAt: {
        type: Date,
        default: Date.now
    },
    UpdateAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('DiscountModel', DiscountModel);
