const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deliveryModel = new Schema({
    deliveryMethod: {
        type: String,
        required: true
    },
    deliveryFees: {
        type: Map,
        of: Number
    },
    weightLimit: {
        type: Number // Giới hạn trọng lượng cân nặng
    },
    sizeLimit: {
        width: { type: Number }, // Giới hạn chiều rộng
        length: { type: Number }, // Giới hạn chiều dài
        height: { type: Number } // Giới hạn chiều cao
    },
}, { timestamps: true });

module.exports = mongoose.model('deliveryModel', deliveryModel);
