const express = require('express');
require('dotenv').config();
const morgan = require('morgan');
const userRoutes = require('./route/User/user.Route');
const loginRoutes = require('./route/User/login.Route');
const productRoutes = require('./route/Product/product.Route');
const orderRoutes = require('./route/Order/order.Route');
const promotionRoutes = require('./route/Promotion/promotion.Route');

// Connect to MongoDB database
require('./config/db/connect').mongoURI;

// Create Express app
const app = express();

// Middleware
app.use(morgan('dev')); // HTTP request logger
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Server is OK!' });
});

app.use('/api/v1/user', userRoutes);
app.use('/api/v1', loginRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/order', orderRoutes);
app.use('/api/v1/promotion', promotionRoutes);

// Handle 404 errors
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error handler
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = app.get('env') === 'development' ? err.message : 'Internal Server Error';
    res.status(status).json({ error: { message } });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
