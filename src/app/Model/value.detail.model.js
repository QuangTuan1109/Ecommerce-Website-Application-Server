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
}, { timestamps: true });

module.exports = mongoose.model('valueDetail', valueDetail)