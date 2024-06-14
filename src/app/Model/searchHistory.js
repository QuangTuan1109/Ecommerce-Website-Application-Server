import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const searchHistoryModel = new Schema({
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer'
    },
    keywords: [{
        type: String,
        required: true
    }],
}, { timestamps: true });

export default mongoose.model('searchHistoryModel', searchHistoryModel);
