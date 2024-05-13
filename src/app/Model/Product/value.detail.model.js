const mongoose = require('mongoose')
const Schema = mongoose.Schema

const valueDetail = new Schema({
    categoryPaths: [String],
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