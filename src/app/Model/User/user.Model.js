const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const userModelSchema = new Schema ({
    AdminID : {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    },
    SellerID: {
        type: Schema.Types.ObjectId,
        ref: 'Seller'
    },
    CustomerID: {
        type: Schema.Types.ObjectId,
        ref: 'Customer'
    },
    Role : [{
        type: Schema.Types.ObjectId,
        ref: 'Role'
    }],
    activeRole: {
        type: Schema.Types.ObjectId,
        ref: 'Role'
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
        maxlength: 50,
    }
});


userModelSchema.pre('save', function(next) {
    if (this.Role.length === 1) {
        this.activeRole = this.Role[0];
    }
    next();
}); 


userModelSchema.methods.isValidPassword = async function(newPassword) {
    try {
        return await bcrypt.compare(newPassword, this.Password);
    } catch (error) {
        throw new Error(error);
    }
};
module.exports = mongoose.model('User', userModelSchema);
