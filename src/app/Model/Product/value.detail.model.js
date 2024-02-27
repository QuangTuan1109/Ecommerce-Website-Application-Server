const mongoose = require('mongoose')
const categoriesModel = require('./categories.Model')
const Schema = mongoose.Schema

const valueDetail = new Schema({
    CategoriesID: {
        type: Schema.Types.ObjectId,
        ref: 'CategoriesModel',
        required: true
    },
    AttributeName: {
        type: String
    },
    Data: {
        type: Array
    },
    CreateAt: {
        type: Date,
        default: Date.now
    },
    UpdateAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('valueDetail', valueDetail)