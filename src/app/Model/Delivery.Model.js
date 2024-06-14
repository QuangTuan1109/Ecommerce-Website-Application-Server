import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const deliveryModel = new Schema({
    deliveryMethod: {
        type: String,
        required: true
    },
    deliveryFees: {
        type: Map,
        of: Number
    },
    weightLimit: {
        type: Number
    },
    sizeLimit: {
        width: { type: Number },
        length: { type: Number },
        height: { type: Number }
    },
}, { timestamps: true });

export default mongoose.model('Delivery', deliveryModel);
