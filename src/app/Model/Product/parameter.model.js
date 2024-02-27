const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const parameterSchema = new Schema({
    ProductGroupID: {
        type: Schema.Types.ObjectId,
        ref: 'ProductGroup'
    },
    Parameter: {
        type: String,
        required: true
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
});

module.exports = mongoose.model('Parameter', parameterSchema);
