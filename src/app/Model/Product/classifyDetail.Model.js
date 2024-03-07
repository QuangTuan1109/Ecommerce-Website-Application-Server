const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classifyDetailModel = new Schema({
    ProductID: {
        type: Schema.Types.ObjectId,
        ref: 'productModel'
    },
    Options: [{
        Option1: String,
        Value1: String,
        Option2: String,
        Value2: String,
        Image: String,
        Price: Number,
        Stock: Number,
        SKU: String
    }],
    CreateAt: {
        type: Date,
        default: Date.now
    },
    UpdateAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('classifyDetailModel', classifyDetailModel);
