const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userModel = new Schema ({
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
    Role : [{
        type: Schema.Types.String,
        ref: 'role'
    }],
})

module.exports = mongoose.model('userModel', userModel);