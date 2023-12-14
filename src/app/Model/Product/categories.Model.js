const mongoose = require('mongoose')
const Schema = mongoose.Schema

const categoriesModel = new Schema({
    ParentCategoryID: {
        type: Schema.Types.String,
        ref: 'categoriesModel'
    },
    Name: {
        type: String
    },
    CreateAt: {
        type: Date
    },
    UpdateAt: {
        type: Date
    },
})

module.exports = mongoose.model('categoriesModel', categoriesModel)