const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const loginModel = new Schema ({
    userID : {
        type: Schema.Types.String,
        ref: 'userModel'
    },
    Email : {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    Password : {
        type: String
    },
    AuthGoogleID : {
        type: String,
        default: null
    },
    AuthFacebookID : {
        type: String,
        default: null
    },
    AuthType : {
        type: String,
        enum: ['local', 'google', 'facebook'],
        default: 'local'
    },
    confirmPassword : {
        type: String, 
        maxLength: 50,
    }
})

module.export = mongoose.model('loginModel', loginModel)