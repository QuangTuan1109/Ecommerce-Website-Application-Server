const jwt = require('jsonwebtoken');
const mongoose = require('mongoose')


const ClassifyDetail = require('../Model/classifyDetail.Model')
const DeliveryMethod = require('../Model/Delivery.Model')
const Product = require('../Model/products.Model')
const Cart = require('../Model/cart.Model')
const Order = require('../Model/order.Model')
const Voucher = require('../Model/voucher.Model')
const CustomerModel = require('../Model/customer.Model')
const UserModel = require('../Model/user.Model')


async function addToCart(req, res) {
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

        const foundUser = await UserModel.findById(userID)
        if (!foundUser) {
            res.status(404).json({ message: 'Not found user' })
        }
        const foundCustomer = await CustomerModel.findOne({ _id: mongoose.Types.ObjectId(foundUser.CustomerID) })
        if (!foundCustomer) {
            res.status(404).json({ message: 'Not found customer' })
        }

        const classifyDetail = await ClassifyDetail.findOne({ ProductID: mongoose.Types.ObjectId(req.params.ProductID) });

        let selectedOption;
        let price;

        if (classifyDetail) {
            if (req.body.Option1 && req.body.Option2) {
                selectedOption = classifyDetail.Options.find(option =>
                    option.Option1 === req.body.Option1 && option.Value1 === req.body.Value1 &&
                    option.Option2 === req.body.Option2 && option.Value2 === req.body.Value2
                );
            } else {
                selectedOption = classifyDetail.Options.find(option =>
                    option.Option1 === req.body.Option1 && option.Value1 === req.body.Value1
                );
            }
            if (selectedOption) {
                price = selectedOption.Price * req.body.Quantity;
            } else {
                return res.status(400).json({ message: 'Selected option not found in ClassifyDetail' });
            }
        } else {
            selectedOption = null
            price = req.body.Price * req.body.Quantity;
        }


        const existingCartItem = await Cart.findOne({
            CustomerID: foundCustomer._id,
            ProductID: req.params.ProductID,
            'classifyDetail.Option1': req.body.Option1,
            'classifyDetail.Value1': req.body.Value1,
            ...(req.body.Option2 && { 'classifyDetail.Option2': req.body.Option2 }),
            ...(req.body.Value2 && { 'classifyDetail.Value2': req.body.Value2 })
        });

        if (existingCartItem) {
            existingCartItem.Quantity += req.body.Quantity;
            existingCartItem.TotalPrices = existingCartItem.Quantity * selectedOption.Price;
            await existingCartItem.save();

            return res.status(200).json({ message: 'Cart item updated successfully' });
        } else {
            const newCartItem = new Cart({
                CustomerID: foundCustomer._id,
                ProductID: req.params.ProductID,
                classifyDetail: selectedOption,
                Quantity: req.body.Quantity,
                TotalPrices: price,
            });

            await newCartItem.save();

            return res.status(201).json({ message: 'Item added to cart successfully' });
        }
    } catch (error) {
        console.error('Error in addToCart:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getCart(req, res) {
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
        const foundUser = await UserModel.findById(userID)
        if (!foundUser) {
            res.status(404).json({ message: 'Not found user' })
        }
        const foundCustomer = await CustomerModel.findOne({ _id: mongoose.Types.ObjectId(foundUser.CustomerID) })
        if (!foundCustomer) {
            res.status(404).json({ message: 'Not found customer' })
        }

        const cartItems = await Cart.find({ CustomerID: foundCustomer._id })
            .populate('ProductID')
            .populate('CustomerID')

        if (cartItems.length === 0) {
            return res.status(404).json({ message: 'Cart is empty' });
        }

        return res.status(200).json({ data: cartItems });
    } catch (error) {
        console.error('Error in getCart:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
async function deleteProductInCart(req, res) {
    try {
        const productID = req.params.productId;
        const { classifyDetail } = req.body;
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        let decodedToken;
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error('Token verification failed:', err);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userID = decodedToken.sub;
        const foundUser = await UserModel.findById(userID);
        if (!foundUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const foundCustomer = await CustomerModel.findOne({ _id: mongoose.Types.ObjectId(foundUser.CustomerID) });
        if (!foundCustomer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const cart = await Cart.findOneAndDelete({
            CustomerID: foundCustomer._id,
            ProductID: mongoose.Types.ObjectId(productID),
            classifyDetail: {
                Option1: classifyDetail.Option1,
                Value1: classifyDetail.Value1,
                Option2: classifyDetail.Option2,
                Image: classifyDetail.Image,
                Price: classifyDetail.Price,
                Stock: classifyDetail.Stock,
                SKU: classifyDetail.SKU,
                _id: mongoose.Types.ObjectId(classifyDetail._id)
            }
        });

        if (!cart) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        return res.status(200).json({ message: 'Product removed from cart' });
    } catch (error) {
        console.error('Error in deleteProductInCart:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
async function order(req, res) {
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
        const foundUser = await UserModel.findById(userID);
        if (!foundUser) {
            return res.status(404).json({ message: 'Not found user' });
        }

        const foundCustomer = await CustomerModel.findOne({ _id: mongoose.Types.ObjectId(foundUser.CustomerID) });
        if (!foundCustomer) {
            return res.status(404).json({ message: 'Not found customer' });
        }

        const { products, phone, paymentMethod, recipName, shippingAddress, totalAmount, voucherSystem, bankTransferImage } = req.body;

        if (!paymentMethod) {
            return res.status(400).json({ message: 'Payment method is required' });
        }

        const oneDay = 24 * 60 * 60 * 1000;
        const currentDate = new Date();
        const confirmationTime = new Date(currentDate.getTime() + oneDay);

        const updatedUsageHistory = [...foundCustomer.usageHistory];
        const cartDeletions = [];
        const classifyDetailUpdates = [];
        const productUpdates = [];

        for (const productItem of products) {
            const classifyDetail = await ClassifyDetail.findOne({
                ProductID: mongoose.Types.ObjectId(productItem.product),
                Options: {
                    $elemMatch: {
                        Option1: productItem.classifyDetail.Option1,
                        Value1: productItem.classifyDetail.Value1,
                        Option2: productItem.classifyDetail.Option2,
                        Value2: productItem.classifyDetail.Value2
                    }
                }
            });

            if (!classifyDetail) {
                return res.status(404).json({ message: 'Classify detail not found for the given product' });
            }

            const checkDelivery = await Product.findOne({
                _id: mongoose.Types.ObjectId(productItem.product),
                'deliveryFee.name': productItem.deliveryMethod,
                'deliveryFee.fee': productItem.deliveryFee
            });
            if (!checkDelivery) {
                return res.status(404).json({ message: 'Delivery invalid!' });
            }

            if (productItem.voucherShop && productItem.voucherShop.length > 0) {
                for (const voucherId of productItem.voucherShop) {
                    const checkVoucher = await Voucher.findById(voucherId);
                    if (!checkVoucher) {
                        return res.status(404).json({ message: 'Voucher invalid!' });
                    }

                    let usageHistory = updatedUsageHistory.find(
                        usage => usage.voucherId.toString() === checkVoucher._id.toString()
                    );

                    if (usageHistory) {
                        if (usageHistory.currentUsage >= checkVoucher.maxUsagePerUser) {
                            return res.status(404).json({ message: 'Voucher usage invalid!' });
                        }
                        usageHistory.currentUsage += 1;
                    } else {
                        updatedUsageHistory.push({
                            voucherId: checkVoucher._id,
                            currentUsage: 1
                        });
                    }
                }
            }

            cartDeletions.push({
                CustomerID: foundUser.CustomerID,
                ProductID: productItem.product,
                classifyDetail: productItem.classifyDetail
            });

            if (productItem.classifyDetail) {
                classifyDetailUpdates.push({
                    ProductID: mongoose.Types.ObjectId(productItem.product),
                    classifyDetail: productItem.classifyDetail,
                    quantity: productItem.quantity
                });
            } else {
                productUpdates.push({
                    ProductID: mongoose.Types.ObjectId(productItem.product),
                    quantity: productItem.quantity
                });
            }
        }

        const newOrder = new Order({
            customer: foundCustomer._id,
            products: products.map(p => ({
                product: mongoose.Types.ObjectId(p.product),
                classifyDetail: p.classifyDetail,
                quantity: p.quantity,
                price: p.price,
                message: p.message || null,
                voucherShop: p.voucherShop ? p.voucherShop.map(voucherShop => mongoose.Types.ObjectId(voucherShop)) : null,
                deliveryMethod: p.deliveryMethod,
                deliveryFee: p.deliveryFee,
                returnStatus: null,
                returnRequestedBy: null,
                confirmationTime: confirmationTime
            })),
            voucherSystem: voucherSystem ? voucherSystem.map(voucherId => mongoose.Types.ObjectId(voucherId)) : null,
            totalAmount,
            recipName,
            shippingAddress,
            phone,
            paymentMethod,
            bankTransferImage,
            cancelledBy: null,
        });

        const savedOrder = await newOrder.save();

        foundCustomer.usageHistory = updatedUsageHistory;
        await foundCustomer.save();

        for (const cartDeletion of cartDeletions) {
            await Cart.deleteMany({
                CustomerID: cartDeletion.CustomerID,
                ProductID: cartDeletion.ProductID,
                'classifyDetail.Option1': cartDeletion.classifyDetail.Option1,
                'classifyDetail.Value1': cartDeletion.classifyDetail.Value1,
                'classifyDetail.Option2': cartDeletion.classifyDetail.Option2,
                'classifyDetail.Value2': cartDeletion.classifyDetail.Value2
            });
        }

        for (const update of classifyDetailUpdates) {
            await ClassifyDetail.updateOne(
                {
                    ProductID: update.ProductID,
                    'Options': {
                        $elemMatch: {
                            Option1: update.classifyDetail.Option1,
                            Value1: update.classifyDetail.Value1,
                            Option2: update.classifyDetail.Option2,
                            Value2: update.classifyDetail.Value2
                        }
                    }
                },
                {
                    $inc: {
                        'Options.$[elem].Stock': -update.quantity
                    }
                },
                {
                    arrayFilters: [
                        {
                            'elem.Option1': update.classifyDetail.Option1,
                            'elem.Value1': update.classifyDetail.Value1,
                            'elem.Option2': update.classifyDetail.Option2,
                            'elem.Value2': update.classifyDetail.Value2
                        }
                    ]
                }
            );
        }

        for (const update of productUpdates) {
            await Product.updateOne(
                { _id: update.ProductID },
                { $inc: { Quantity: -update.quantity } }
            );
        }

        res.status(201).json(savedOrder);
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
}

async function getOrdersByCustomer(req, res) {
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
        const foundUser = await UserModel.findById(userID);
        if (!foundUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const foundCustomer = await CustomerModel.findOne({ _id: mongoose.Types.ObjectId(foundUser.CustomerID) });
        if (!foundCustomer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const orders = await Order.find({ customer: foundCustomer._id })
            .populate('products.product')
            .populate('products.voucherShop')
            .populate('customer');

        if (orders.length === 0) {
            return res.status(404).json({ message: 'No orders found with the specified status' });
        }

        return res.status(200).json({ data: orders });
    } catch (error) {
        console.error('Error in getOrdersByCustomer:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getOrderBySeller(req, res) {
    try {
        const userId = req.params.sellerId;

        const foundUser = await UserModel.findOne({ _id: userId });

        if (foundUser) {
            const products = await Product.find({ SellerID: mongoose.Types.ObjectId(foundUser.SellerID) }).select('_id');

            let productIds = products.map(product => product._id.toString().trim());

            let orders = await Order.find({
                'products.product': { $in: productIds.map(id => mongoose.Types.ObjectId(id)) }
            }).populate('products.product').populate('products.voucherShop');

            const ordersWithFilteredProducts = orders.map(order => {
                order.products = order.products.filter(product => {
                    return productIds.includes(product.product._id.toString().trim());
                });
                return order;
            });

            const pendingOrders = ordersWithFilteredProducts.filter(order => order.orderStatus === 'Pending');
            const otherOrders = ordersWithFilteredProducts.filter(order => order.orderStatus !== 'Pending');

            res.json([...pendingOrders.sort((a, b) => a.confirmationTime - b.confirmationTime), ...otherOrders]);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateVoucherAndStock(order) {
    const customer = await CustomerModel.findById(order.customer);

    order.products.forEach(async (product) => {
        if (product.voucherShop && product.voucherShop.length > 0) {
            for (const voucherId of product.voucherShop) {
                const voucher = await Voucher.findById(voucherId);
                if (voucher) {
                    let usageHistory = customer.usageHistory.find(
                        usage => usage.voucherId.toString() === voucherId.toString()
                    );

                    if (usageHistory) {
                        usageHistory.currentUsage -= 1
                    }

                    await customer.save();
                }
            }
        }

        if (product.classifyDetail) {
            const classifyDetail = await ClassifyDetail.findOne({
                ProductID: product.product,
                'Options.Option1': product.classifyDetail.Option1,
                'Options.Value1': product.classifyDetail.Value1,
                'Options.Option2': product.classifyDetail.Option2,
                'Options.Value2': product.classifyDetail.Value2
            });

            if (classifyDetail) {
                const optionIndex = classifyDetail.Options.findIndex(option =>
                    option.Option1 === product.classifyDetail.Option1 &&
                    option.Value1 === product.classifyDetail.Value1 &&
                    option.Option2 === product.classifyDetail.Option2 &&
                    option.Value2 === product.classifyDetail.Value2
                );

                if (optionIndex !== -1) {
                    classifyDetail.Options[optionIndex].Stock += product.quantity;
                    await classifyDetail.save();
                }
            }
        } else {
            const productInStock = await Product.findById(product.product);
            if (productInStock) {
                productInStock.Quantity += product.quantity;
                await productInStock.save();
            }
        }
    });
}

async function cancelOrder(req, res) {
    try {
        const { orderId, userId } = req.body;

        const user = await UserModel.findById(userId).populate('activeRole');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const role = user.activeRole ? user.activeRole.name : '';

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.orderStatus === 'Pending') {
            order.products.forEach(product => {
                product.productStatus = 'Cancelled';
            });
            order.orderStatus = 'Cancelled';
            order.cancelledBy = role;
            await order.save();

            await updateVoucherAndStock(order);

            return res.status(200).json({ message: 'Order cancelled successfully' });
        } else if (order.orderStatus === 'Confirmed') {
            if (role === 'customer') {
                order.cancelRequest = true;
                order.cancelledBy = role;
                await order.save();
                return res.status(200).json({ message: 'Cancel request sent to seller' });
            } else if (role === 'seller') {
                if (order.cancelRequest) {
                    order.orderStatus = 'Cancelled';
                    order.cancelRequest = false;
                    await order.save();

                    await updateVoucherAndStock(order);

                    return res.status(200).json({ message: 'Order cancelled successfully by seller' });
                } else {
                    return res.status(400).json({ message: 'No cancel request found' });
                }
            } else {
                return res.status(400).json({ message: 'Only customer or seller can cancel the order' });
            }
        } else {
            return res.status(400).json({ message: 'Order cannot be cancelled in current status' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function confirmOrderByCustomer(req, res) {
    const { orderId } = req.body;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order invalid" });
        }

        const isProductReturn = order.products.some(product => product.productStatus === 'Return/Refund');


        if (isProductReturn) {
            const productToReturn = order.products.find(product => product.productStatus === 'Return/Refund');

            if (productToReturn) {
                productToReturn.returnOrderStatus = 'Completed';
            }
            order.orderStatus = 'Completed';
            order.updated = new Date();
        } else {
            order.products.forEach(product => {
                product.productStatus = 'Completed';
            });
    
            order.orderStatus = 'Completed';
            order.updated = new Date();
        }
        await order.save();

        return res.status(200).json({ message: "The order has been confirmed and the status has been updated to Completed" });
    } catch (error) {
        console.error("Error when confirming order:", error);
        return res.status(500).json({ message: "An error occurred while confirming the order" });
    }
}

async function ReturnOrder(req, res) {
    const { orderRequest, userId } = req.body;

    try {
        const order = await Order.findById(orderRequest._id);
        if (!order) {
            return res.status(400).json({ message: "Please provide valid order information" });
        }

        const user = await UserModel.findById(userId).populate('activeRole');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const role = user.activeRole ? user.activeRole.name : '';

        const allReturnRefund = order.products.every(product => product.productStatus === 'Return/Refund');

        if (allReturnRefund) {
            order.orderStatus = 'Return/Refund';
        } else {
            order.orderStatus = 'Partial Return/Refund';
        }

        orderRequest.products.forEach(productRequest => {
            if (productRequest.returnRequest) {
                if (!productRequest.returnReason) {
                    return res.status(400).json({ message: "Please provide return reason for the product" });
                }

                const productToUpdate = order.products.find(product => product._id.toString() === productRequest._id);
                if (productToUpdate) {
                    productToUpdate.returnRequest = true;
                    productToUpdate.returnReason = productRequest.returnReason;
                    productToUpdate.returnStatus = 'Pending';
                    productToUpdate.returnOrderStatus = 'Pending';
                    productToUpdate.returnRequestedBy = role;
                    productToUpdate.productStatus = 'Return/Refund';
                }
            }
        });
        order.updated = new Date();

        await order.save();

        return res.status(200).json({ message: "The request to return the product has been sent successfully" });
    } catch (error) {
        console.error("Error when confirming product return:", error);
        return res.status(500).json({ message: "An error occurred while returning the product" });
    }
}

async function confirmOrderBySeller(req, res) {
    const { orderId, productId, classifyDetailId } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const product = order.products.find(p => {
            if (classifyDetailId) {
                return p.product.toString() === productId && p.classifyDetail._id.toString() === classifyDetailId;
            } else {
                return p.product.toString() === productId;
            }
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found in order' });
        }

        product.productStatus = 'Confirmed';
        order.updated = new Date();
        product.confirmationTime = null

        const allProductsConfirmed = order.products.every(p => p.productStatus === 'Confirmed');

        if (allProductsConfirmed) {
            order.orderStatus = 'Confirmed';
        }

        await order.save();

        res.status(200).json({ message: 'Product confirmed and order status updated', order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

async function shippingOrderBySeller(req, res) {
    const { orderId, productId, classifyDetailId } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const product = order.products.find(p => {
            if (classifyDetailId) {
                return p.product.toString() === productId && p.classifyDetail._id.toString() === classifyDetailId;
            } else {
                return p.product.toString() === productId;
            }
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found in order' });
        }

        if (product.returnOrderStatus === 'Confirmed' && product.returnRequest) {
            product.returnOrderStatus = 'Shipped';
            order.updated = new Date();
        } else {
            product.productStatus = 'Shipped';
            order.updated = new Date();
      
            const allProductsConfirmed = order.products.every(p => p.productStatus === 'Shipped');
    
            if (allProductsConfirmed) {
                order.orderStatus = 'Shipped';
            }
        }


        await order.save();

        res.status(200).json({ message: 'Product Shipped and order status updated', order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }

}

async function approveReturn(req, res) {
    const { orderId, productId, classifyDetailId } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const product = order.products.find(p => {
            if (classifyDetailId) {
                return p.product.toString() === productId && p.classifyDetail._id.toString() === classifyDetailId;
            } else {
                return p.product.toString() === productId;
            }
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found in order' });
        }

        if(product.returnRequest) {
            product.returnStatus = 'Approved';
            product.returnOrderStatus = 'Confirmed';
            order.updated = new Date();
        }

        await order.save();

        res.status(200).json({ message: 'Product Shipped and order status updated', order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

async function rejectReturn(req, res) {
    const { orderId, productId, classifyDetailId } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const product = order.products.find(p => {
            if (classifyDetailId) {
                return p.product.toString() === productId && p.classifyDetail._id.toString() === classifyDetailId;
            } else {
                return p.product.toString() === productId;
            }
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found in order' });
        }

        if(product.returnRequest) {
            product.returnStatus = 'Rejected';
            product.returnOrderStatus = 'Failed';
            order.updated = new Date();
        }

        await order.save();

        res.status(200).json({ message: 'Product Shipped and order status updated', order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    addToCart,
    deleteProductInCart,
    getCart,
    order,
    getOrdersByCustomer,
    getOrderBySeller,
    cancelOrder,
    confirmOrderByCustomer,
    updateVoucherAndStock,
    ReturnOrder,
    confirmOrderBySeller,
    shippingOrderBySeller,
    approveReturn,
    rejectReturn
};
