import mongoose from 'mongoose';
const { Schema } = mongoose;

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

export default mongoose.model('Review', reviewSchema);
