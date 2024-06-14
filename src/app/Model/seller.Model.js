import mongoose from 'mongoose';
const { Schema } = mongoose;

const sellerSchema = new Schema ({
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
    EmailAddress : {
        type: String
    },
    Phone : {
        type: String,
        unique: true,
        required: true
    },
    Following : [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    Follower : [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

export default mongoose.model('Seller', sellerSchema);
