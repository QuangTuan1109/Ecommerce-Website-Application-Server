import mongoose from 'mongoose';
const { Schema } = mongoose;

const productModel = new Schema({
    SellerID: {
        type: Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    Name: {
        type: String,
        minlength: 10,
        maxlength: 120,
        required: true
    },
    Description: {
        type: String,
        maxlength: 3000,
        required: true
    },
    Image: [
        {
            type: String,
            required: true
        }
    ],
    Video: {
        type: String,
        required: true
    },
    Category: {
        type: String,
        required: true
    },
    Detail: {
        type: Schema.Types.Mixed,
        required: true
    },
    Price: {
        type: Number,
    },
    PriceRange: {
        type: String,
    },
    Quantity: {
        type: Number
    },
    Rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    Like: {
        type: Number,
        default: 0
    },
    Weight: Number,
    Height: Number,
    Width: Number,
    Length: Number,
    hazardousGoods: {
        type: String,
        enum: ['Yes', 'No']
    },
    deliveryFee: [{
        name: String,
        fee: Number
    }],
    preOrderGoods: {
        type: String,
        enum: ['Yes', 'No']
    },
    preparationTime: {
        type: Number,
        require: true
    },
    Status: {
        type: String,
        enum: ['New', 'Old'],
        default: 'New'
    },
    SKU: {
        type: String
    },
    DiscountType: {
        type: String,
        enum: ['Fixed', 'Percentage'],
        default: 'Percentage'
    },
    DiscountValue: {
        type: Number,
        default: 0
    },
    Quality: {
        type: String
    }
}, { timestamps: true });

export default mongoose.model('productModel', productModel);
