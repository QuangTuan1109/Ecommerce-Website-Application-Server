import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const categoriesModel = new Schema({
    ParentCategoryID: {
        type: Schema.Types.ObjectId,
        ref: 'Categories'
    },
    Name: {
        type: String,
        required: true
    },
}, { timestamps: true });

export default mongoose.model('Categories', categoriesModel);
