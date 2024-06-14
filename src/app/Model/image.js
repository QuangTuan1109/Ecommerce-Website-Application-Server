import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const imagesSchema = new Schema ({
    name: {
        type: String,
        required: true,
        unique: true
    },
    image: {
        type: String
    },
}, { timestamps: true });

export default mongoose.model('Images', imagesSchema);
