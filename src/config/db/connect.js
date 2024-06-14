import mongoose from 'mongoose';

await mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

export const mongoURI = process.env.DATABASE;
