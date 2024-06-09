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
}, { timestamps: true });

module.exports = mongoose.model('DiscountModel', DiscountModel);
