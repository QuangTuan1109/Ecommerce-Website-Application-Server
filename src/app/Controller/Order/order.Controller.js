const jwt = require('jsonwebtoken');
const mongoose = require('mongoose')


const ClassifyDetail = require('../../Model/Product/classifyDetail.Model')
const DeliveryMethod = require('../../Model/Product/Delivery.Model')
const Product = require('../../Model/Product/products.Model')
const Cart = require('../../Model/Order/cart.Model')
const Order = require('../../Model/Order/order.Model')
const Voucher = require('../../Model/Promotion/voucher.Model')
const ShippingAddress = require('../../Model/Order/shippingInfor.Model')


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

        const CustomerID = decodedToken.sub;
        
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
            CustomerID: CustomerID,
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
                CustomerID: CustomerID,
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

        const CustomerID = decodedToken.sub;

        const cartItems = await Cart.find({ CustomerID }).populate('ProductID');

        if (cartItems.length === 0) {
            return res.status(404).json({ message: 'Cart is empty' });
        }

        return res.status(200).json({data: cartItems});
    } catch (error) {
        console.error('Error in getCart:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
async function deleteProductInCart(req, res) {
    try {
        const productID = req.params.productId;
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const customerID = decodedToken.sub;

        if (!customerID || !productID) {
            return res.status(400).json({ message: 'Customer ID and Product ID are required' });
        }

        const cart = await Cart.findOneAndDelete({
            CustomerID: customerID,
            ProductID: productID
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

        const customerId = decodedToken.sub;

        const {
            products,
            message,
            paymentMethod,
            voucherCode
        } = req.body;

        const totalAmount = products.length;

        let totalProductPrice = 0;
        let price;
        for (const productItem of products) {
            const classifyDetail = await ClassifyDetail.findOne({ ProductID: mongoose.Types.ObjectId(productItem._id) });
            if (!classifyDetail) {
                return res.status(404).json({ message: 'Classify detail not found for the given product' });
            }

            const selectedOption = classifyDetail.Options.find(option =>
                option.Option1 === productItem.Option1 && option.Value1 === productItem.Value1 &&
                option.Option2 === productItem.Option2 && option.Value2 === productItem.Value2
            );

            if (!selectedOption) {
                return res.status(400).json({ message: 'Selected option not found in ClassifyDetail' });
            }

            price = selectedOption.Price * productItem.quantity;
            totalProductPrice += price;
        }

        let voucher = null;
        if (voucherCode) {
            voucher = await Voucher.findOne({ code: voucherCode });
            if (!voucher || !voucher.isValid) {
                return res.status(400).json({ message: 'Invalid voucher' });
            }

            switch (voucher.target) {
                case 'SingleProduct':
                    if (!voucher.productId.equals(products[0]._id)) {
                        return res.status(400).json({ message: 'Voucher is not applicable for this product' });
                    }
                    break;
                case 'ProductCategory':
                    const productCategories = products.map(productItem => productItem.categoryId);

                    if (!voucher.categoryIds.some(categoryId => productCategories.includes(categoryId))) {
                        return res.status(400).json({ message: 'Voucher is not applicable for these products' });
                    }
                    break;
                case 'MinOrderAmount':
                    if (totalProductPrice < voucher.minOrderAmount) {
                        return res.status(400).json({ message: 'Voucher cannot be applied. Minimum order amount not met' });
                    }
                    break;
            }
        }

        const deliveryMethod = await DeliveryMethod.findOne({ name: req.body.deliveryMethod });
        const deliveryFee = deliveryMethod.deliveryFee;

        const shippingAddress = await ShippingAddress.findOne({ customerId: customerId, isDefault: true });
        if (!shippingAddress) {
            throw new Error('Default shipping address not found');
        }

        const newOrder = new Order({
            customer: customerId,
            products: [{
                product: products._id,
                classifyDetail: selectedOption,
                quantity,
                price
            }],
            totalProductPrice,
            voucher: voucher ? voucher._id : null,
            deliveryMethod: deliveryMethod._id,
            deliveryFee,
            totalAmount,
            message,
            shippingAddress: shippingAddress._id,
            paymentMethod
        });

        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}


module.exports = {
    addToCart,
    deleteProductInCart,
    getCart,
    order
};
