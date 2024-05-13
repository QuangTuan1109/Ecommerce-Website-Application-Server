const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DiscountModel = new Schema({
    ProductID: {
        type: Schema.Types.ObjectId,
        ref: 'productModel'
    },
    Value: [{
        from: {
            type: Number,
        },
        to: {
            type: Number,
        },
        price: {
            type: Number,
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
