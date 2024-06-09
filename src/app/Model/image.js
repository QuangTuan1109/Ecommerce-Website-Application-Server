const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const imagesSchema = new Schema ({
    name: {
        type: String,
        required: true,
        unique: true
    },
    image: {
        type: String
    },
}, { timestamps: true });

module.exports = mongoose.model('Images', imagesSchema);
