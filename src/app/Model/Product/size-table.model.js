const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sizeTableSchema = new Schema({
    Name: {
        type: String,
        required: true
    },
    Data: [{
        Parameter: {
            type: String
        },
        DataParameter: {
            type: String
        },
    }],
    CreateAt: {
        type: Date,
        default: Date.now
    },
    UpdateAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SizeTable', sizeTableSchema);
