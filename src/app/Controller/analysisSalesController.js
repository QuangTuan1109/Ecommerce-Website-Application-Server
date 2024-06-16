import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import User from '../Model/user.Model.js';
import Seller from '../Model/seller.Model.js';
import Order from '../Model/order.Model.js';
import Voucher from '../Model/voucher.Model.js'
import SalesSummary from '../Model/salesSumaryModel.js';

//import moment from 'moment';

async function updateHourlyStats(req, res) {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userID = decodedToken.sub;
        const foundUser = await User.findById(userID);
        if (!foundUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const foundSeller = await Seller.findById(foundUser.SellerID);
        if (!foundSeller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        const today = new Date();
        const currentHour = today.getHours();
        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        let salesSummary = await SalesSummary.findOneAndUpdate(
            {
                sellerId: foundSeller._id,
                'monthlyStats.month': currentMonth
            },
            {
                $setOnInsert: {
                    sellerId: foundSeller._id,
                    monthlyStats: {
                        month: currentMonth,
                        ordersThisMonth: 0,
                        revenueThisMonth: 0,
                        dailyStats: []
                    }
                }
            },
            {
                new: true,
                upsert: true
            }
        );

        const ordersToday = await Order.find({
            createdDate: {
                $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
            }
        }).populate('products.product');

        const updatedOrders = new Set(salesSummary.updatedOrders.map(order => order.toString()));

        let totalOrders = 0;
        let totalRevenue = 0;

        for (const order of ordersToday) {
            if (!updatedOrders.has(order._id.toString())) {
                for (const product of order.products) {
                    if (
                        product.product.SellerID.toString() === foundSeller._id.toString() &&
                        (product.productStatus === 'Completed' || product.returnOrderStatus === 'Completed')
                    ) {
                        let voucherDiscount = 0;
                        if (product.voucherShop && product.voucherShop.length > 0) {
                            for (const voucherId of product.voucherShop) {
                                const voucher = await Voucher.findById(voucherId);
                                if (voucher) {
                                    voucherDiscount += voucher.discountValue;
                                }
                            }
                        }

                        totalOrders += product.quantity;
                        totalRevenue += (product.price - voucherDiscount);
                    }
                }
                updatedOrders.add(order._id.toString());
            }
        }

        const monthlyStatsIndex = salesSummary.monthlyStats.findIndex(stat => stat.month.getTime() === currentMonth.getTime());
        if (monthlyStatsIndex !== -1) {
            const monthlyStats = salesSummary.monthlyStats[monthlyStatsIndex];
            monthlyStats.ordersThisMonth += totalOrders;
            monthlyStats.revenueThisMonth += totalRevenue;

            const dailyStatsIndex = monthlyStats.dailyStats.findIndex(stat => stat.date.getDate() === today.getDate());
            if (dailyStatsIndex !== -1) {
                const hourlyStats = monthlyStats.dailyStats[dailyStatsIndex].hourlyStats;
                const existingHourlyStats = hourlyStats.find(stat => stat.hour === currentHour);
                if (existingHourlyStats) {
                    existingHourlyStats.orders += totalOrders;
                    existingHourlyStats.revenue += totalRevenue;
                } else {
                    hourlyStats.push({
                        hour: currentHour,
                        orders: totalOrders,
                        revenue: totalRevenue
                    });
                }
            } else {
                const newDailyStats = {
                    date: today,
                    hourlyStats: [{
                        hour: currentHour,
                        orders: totalOrders,
                        revenue: totalRevenue
                    }]
                };
                monthlyStats.dailyStats.push(newDailyStats);
            }
            await SalesSummary.findOneAndUpdate(
                { _id: salesSummary._id },
                { $set: { 'monthlyStats': salesSummary.monthlyStats, 'updatedOrders': Array.from(updatedOrders) } }
            );
        } else {
            const newMonthlyStats = {
                month: currentMonth,
                ordersThisMonth: totalOrders,
                revenueThisMonth: totalRevenue,
                dailyStats: [{
                    date: today,
                    hourlyStats: [{
                        hour: currentHour,
                        orders: totalOrders,
                        revenue: totalRevenue
                    }]
                }]
            };
            salesSummary.monthlyStats.push(newMonthlyStats);
            salesSummary.updatedOrders = Array.from(updatedOrders);
            await salesSummary.save();
        }

        res.json(salesSummary);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


async function updateMonthlyStas(req, res) {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userID = decodedToken.sub;
        const foundUser = await User.findById({ _id: mongoose.Types.ObjectId(userID) });
        const foundSeller = await Seller.findById({ _id: foundUser.SellerID });
        if (!foundSeller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const salesSummary = await SalesSummary.findOne({
            month: firstDayOfMonth,
            sellerId: foundSeller._id
        });

        if (!salesSummary) {
            return res.json({ revenueThisMonth: 0, ordersThisMonth: 0 });
        }

        let revenueThisMonth = 0;
        let ordersThisMonth = 0;

        salesSummary.dailyStats.forEach(stat => {
            revenueThisMonth += stat.revenue;
            ordersThisMonth += stat.orders;
        });

        res.json({ revenueThisMonth, ordersThisMonth });

    } catch (error) {
        
    }
    
}

export default {
    updateHourlyStats,
    updateMonthlyStas
}