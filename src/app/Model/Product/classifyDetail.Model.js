const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classifyDetailModel = new Schema({
    Classify1: {
        type: Schema.Types.ObjectId,
        ref: 'classify1Model'
    },
    Classify2: {
        type: Schema.Types.ObjectId,
        ref: 'classify2Model'
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

module.exports = mongoose.model('classifyDetailModel', classifyDetailModel);
