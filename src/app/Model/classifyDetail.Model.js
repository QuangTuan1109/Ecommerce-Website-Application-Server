import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const classifyDetailModel = new Schema({
    ProductID: {
        type: Schema.Types.ObjectId,
        ref: 'productModel'
    },
    Options: [{
        Option1: String,
        Value1: String,
        Option2: String,
        Value2: String,
        Image: [String],
        Price: Number,
        Stock: Number,
        SKU: String
    }]
}, { timestamps: true });

export default mongoose.model('ClassifyDetail', classifyDetailModel);
