const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classify1Model = new Schema({
    Name: {
        type: String,
        required: true
    },
    Classify: {
        type: String,
        required: true
    },
    Image: {
        type: [String],
        default: []
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

module.exports = mongoose.model('classify1Model', classify1Model);
