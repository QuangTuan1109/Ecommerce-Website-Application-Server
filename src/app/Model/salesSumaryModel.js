import mongoose from 'mongoose';

const { Schema } = mongoose;

const hourlyStatsSchema = new Schema({
    hour: {
        type: Number,
        required: true
    },
    orders: {
        type: Number,
        default: 0
    },
    revenue: {
        type: Number,
        default: 0
    }
}, { _id: false });

const dailyStatsSchema = new Schema({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    hourlyStats: [hourlyStatsSchema]
}, { _id: false });

const monthlyStatsSchema = new Schema({
    month: {
        type: Date,
        required: true,
        unique: true
    },
    ordersThisMonth: {
        type: Number,
        default: 0
    },
    revenueThisMonth: {
        type: Number,
        default: 0
    },
    dailyStats: [dailyStatsSchema] 
}, { _id: false });

const salesSummarySchema = new Schema({
    sellerId: {
        type: Schema.Types.ObjectId,
        ref: 'Seller',
        required: true,
        unique: true
    },
    monthlyStats: [monthlyStatsSchema],
    updatedOrders: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }]
});

export default mongoose.model('SalesSummary', salesSummarySchema);
