const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const customerSchema = new Schema ({
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
});

module.exports = mongoose.model('Customer', customerSchema);
