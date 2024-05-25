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
}, { timestamps: true });

module.exports = mongoose.model('Categories', categoriesModel);
