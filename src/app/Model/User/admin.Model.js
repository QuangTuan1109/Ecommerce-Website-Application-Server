const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema ({
    Fullname : {
        type: String,
        maxlength: 30,
        required: true
    },
    Image : {
        type: String
    },
    Address : {
        type: String
    },
    Phone : {
        type: String,
        unique: true,
        required: true
    },
    Following : {
        type: String
    },
    Follower : {
        type: String
    },
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
