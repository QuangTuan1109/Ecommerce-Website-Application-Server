import mongoose from 'mongoose';

mongoose.Promise = global.Promise;

const ROLES = ["admin", "customer", "seller"];

export { mongoose, ROLES };
