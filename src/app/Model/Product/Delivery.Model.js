const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deliveryModel = new Schema({
    deliveryMethod: {
        type: String,
        required: true
    },
    deliveryFees: {
        type: Map,
        of: Number
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

module.exports = mongoose.model('deliveryModel', deliveryModel);
