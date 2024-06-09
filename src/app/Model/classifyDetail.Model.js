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
        Image: Array,
        Price: Number,
        Stock: Number,
        SKU: String
    }]
},  { timestamps: true });

module.exports = mongoose.model('classifyDetailModel', classifyDetailModel);
