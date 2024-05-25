const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    seller: {
        type: Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'productModel',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    helpfulCount: {
        type: Number,
        default: 0
    },
    sellerResponse: {
        type: String
    },
    sellerResponseDate: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
