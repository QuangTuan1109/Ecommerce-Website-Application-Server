const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const likeSchema = new Schema({
    productID: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    },
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'User'
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

module.exports = mongoose.model('Like', likeSchema);
