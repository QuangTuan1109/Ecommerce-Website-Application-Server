const mongoose = require('mongoose')
const Schema = mongoose.Schema

const productModel = new Schema({
    SellerID: {
        type: Schema.Types.String,
        ref: 'sellerModel'
    },
    Name: {
        type: String
    },
    Price: {
        type:  Number
    },
    Descriptions: {
        type: String
    },
    Image: {
        type: Array
    },
    Category: {
        type: String
    },
    Rating: {
        type: Number
    },
    Size: {
        type: Array
    },
    Color: {
        type: Array
    },
    Like: {
        type: Number
    },
    Quantity: {
        type: Number
    },
    Detail: {
        type: String
    },
    Type: {
        type: String
    },
    Status: {
        type: String
    },
    CreateAt: {
        type: Date
    },
    UpdateAt: {
        type: Date
    },
})

module.exports = mongoose.model('productModel', productModel)