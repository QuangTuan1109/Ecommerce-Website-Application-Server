import mongoose from 'mongoose';

const { Schema } = mongoose;

const valueDetail = new Schema({
    categoryPaths: [String],
    AttributeName: {
        type: String
    },
    Data: {
        type: Array
    },
}, { timestamps: true });

export default mongoose.model('ValueDetail', valueDetail)