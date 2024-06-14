import mongoose from 'mongoose';

const { Schema, model } = mongoose;

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

export default mongoose.model('DiscountModel', DiscountModel);
