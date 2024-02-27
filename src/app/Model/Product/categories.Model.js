const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categoriesModel = new Schema({
    ParentCategoryID: {
        type: Schema.Types.ObjectId,
        ref: 'categoriesModel'
    },
    Name: {
        type: String,
        required: true
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

module.exports = mongoose.model('categoriesModel', categoriesModel);
