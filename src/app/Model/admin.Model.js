import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const adminSchema = new Schema ({
    Fullname : {
        type: String,
        maxlength: 30,
        required: true
    },
    Image : {
        type: String
    },
    Address : {
        type: String
    },
    Phone : {
        type: String,
        unique: true,
        required: true
    },
    Following : {
        type: String
    },
    Follower : {
        type: String
    },
}, { timestamps: true });

export default model('Admin', adminSchema);
