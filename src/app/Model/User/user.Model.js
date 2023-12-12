const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bcrypt = require('bcryptjs');

const userModel = new Schema ({
    AdminID : {
        type: Schema.Types.String,
        ref: 'adminModel'
    },
    SellerID: {
        type: Schema.Types.String,
        ref: 'sellerModel'
    },
    CustomerID: {
        type: Schema.Types.String,
        ref: 'customerModel'
    },
    Role : [{
        type: Schema.Types.String,
        ref: 'role'
    }],
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

userModel.pre('save', async function(next){
    try {
        if (this.AuthType !== 'local') next()

        //Generate a salt
        const salt = await bcrypt.genSalt(10)
        //Genarate a password 
        const passwordHashed = await bcrypt.hash(this.Password, salt)
        //Re-assign password hashed
        this.Password = passwordHashed
        next()
    } catch (error) {
        next(error)
    }
})

userModel.methods.isValidPassword = async function(newPassword){
    try{
        return await bcrypt.compare(newPassword, this.Password)
    } catch(error){
        throw new Error(error)
    }
}

module.exports = mongoose.model('userModel', userModel);