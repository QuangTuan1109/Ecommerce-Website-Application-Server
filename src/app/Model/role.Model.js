import mongoose from 'mongoose';
const { Schema } = mongoose;

const roleSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    }
}, {
    timestamps: true
});

export default mongoose.model('Role', roleSchema);
