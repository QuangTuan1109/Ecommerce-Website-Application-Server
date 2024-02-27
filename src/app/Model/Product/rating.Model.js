const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ratingSchema = new Schema({
    productID: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    Rating: {
        type: Number
    },
    Review: {
        type: String
    },
    CreateAt: {
        type: Date,
        default: Date.now
    },
    UpdateAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Rating', ratingSchema);
