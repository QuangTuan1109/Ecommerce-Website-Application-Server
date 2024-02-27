const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productGroupSchema = new Schema({
    CategoryID: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
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

module.exports = mongoose.model('ProductGroup', productGroupSchema);
