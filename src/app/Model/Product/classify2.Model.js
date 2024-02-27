const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classify2Model = new Schema({
    Name: {
        type: String,
        required: true
    },
    Classify: {
        type: String,
        required: true
    },
    Price: {
        type: Number,
        required: true,
        min: 0 
    },
    Quantity: {
        type: Number,
        required: true,
        min: 0 
    },
    Code: {
        type: String
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

module.exports = mongoose.model('classify2Model', classify2Model);
