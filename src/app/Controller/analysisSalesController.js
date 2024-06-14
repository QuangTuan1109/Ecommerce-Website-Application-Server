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

        // Tìm hoặc tạo SalesSummary cho Seller trong ngày hôm nay
        let salesSummary = await SalesSummary.findOneAndUpdate(
            {
                sellerId: foundSeller._id,
                'dailyStats.date': {
                    $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                    $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                }
            },
            {
                $setOnInsert: {
                    sellerId: foundSeller._id,
                    dailyStats: {
                        date: today,
                        hourlyStats: []
                    }
                }
            },
            {
                new: true,
                upsert: true
            }
        );

        // Lấy danh sách các đơn hàng của Seller trong khoảng thời gian hôm nay
        const ordersToday = await Order.find({
            createdDate: {
                $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
            }
        }).populate('products.product');

        // Tạo một Set để lưu trữ ID của các đơn hàng đã được cập nhật
        const updatedOrders = new Set(salesSummary.updatedOrders.map(order => order.toString()));

        // Lọc và tính tổng số lượng và doanh thu từ các sản phẩm của người bán
        let totalOrders = 0;
        let totalRevenue = 0;

        for (const order of ordersToday) {
            for (const product of order.products) {
                if (product.product.SellerID.toString() === foundSeller._id.toString() && !updatedOrders.has(product.product._id.toString())) {
                    // Kiểm tra và lấy giá trị voucher nếu có
                    let voucherDiscount = 0;
                    if (product.voucherShop && product.voucherShop.length > 0) {
                        for (const voucherId of product.voucherShop) {
                            const voucher = await Voucher.findById(voucherId);
                            if (voucher) {
                                voucherDiscount += voucher.discountValue;
                            }
                        }
                    }

                    updatedOrders.add(product.product._id.toString());
                    totalOrders += product.quantity;
                    totalRevenue += (product.price - voucherDiscount);
                }
            }
        }
        // Tìm và cập nhật hoặc thêm mới thông tin thống kê hàng giờ vào SalesSummary
        const dailyStatsIndex = salesSummary.dailyStats.findIndex(stat => stat.date.getDate() === today.getDate());
        if (dailyStatsIndex !== -1) {
            const hourlyStats = salesSummary.dailyStats[dailyStatsIndex].hourlyStats;
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
            // Cập nhật lại dailyStats và updatedOrders trong SalesSummary
            await SalesSummary.findOneAndUpdate(
                { _id: salesSummary._id },
                { $set: { 'dailyStats': salesSummary.dailyStats, 'updatedOrders': Array.from(updatedOrders) } }
            );
        } else {
            // Tạo mới dailyStats và thêm vào SalesSummary
            const newDailyStats = {
                date: today,
                hourlyStats: [{
                    hour: currentHour,
                    orders: totalOrders,
                    revenue: totalRevenue
                }]
            };
            salesSummary.dailyStats.push(newDailyStats);
            salesSummary.updatedOrders = Array.from(updatedOrders);
            await salesSummary.save();
        }

        res.json({ message: 'Hourly stats updated successfully' });
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