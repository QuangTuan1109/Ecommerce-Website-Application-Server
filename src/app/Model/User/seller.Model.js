const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sellerModel = new Schema ({
    Fullname : {
        type: String,
        maxLength: 30
    },
    Image : {
        type: String
    },
    Address : {
        type: String
    },
    Phone : {
        type: String,
        unique: true
    },
    Following : {
        type: String
    },
    Follower : {
        type: String
    },
})

module.exports = mongoose.model('sellerModel', sellerModel);