import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const customerSchema = new Schema({
    Fullname: {
        type: String,
        maxlength: 30,
        required: true
    },
    Image: {
        type: String
    },
    Address: {
        type: String
    },
    Phone: {
        type: String,
        unique: true,
        required: true
    },
    DOB: {
        type: Date,
        required: true
    },
    Sex: {
        type: String,
        required: true
    },
    Nation: {
        type: String,
    },
    ProvinceOrCity: {
        type: String,
    },
    Following: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    Follower: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    Wishlist: [{
        type: Schema.Types.ObjectId,
        ref: 'productModel'
    }],
    usageHistory: [{
        voucherId: {
            type: Schema.Types.ObjectId,
            ref: 'Voucher'
        },
        currentUsage: {
            type: Number,
            default: 0
        }
    }],
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
