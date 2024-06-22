import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './route/user.Route.js';
import loginRoutes from './route/login.Route.js';
import productRoutes from './route/product.Route.js';
import orderRoutes from './route/order.Route.js';
import promotionRoutes from './route/promotion.Route.js';
import imageRoutes from './route/imageRoute.js';
import analysisSalesRoute from './route/analysisSalesRoute.js';
import cors from 'cors';
import mongoose from 'mongoose';
import { mongoURI } from './config/db/connect.js';
import { SessionsClient } from '@google-cloud/dialogflow'; // Import SessionsClient from @google-cloud/dialogflow

dotenv.config();

// Connect to MongoDB database
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Database Connected!"))
    .catch(err => console.log("MongoDB Connection error: ", err));

// Create Express app
const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type']
}));

// Middleware
app.use(morgan('dev')); // HTTP request logger
app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
})); // Increased limit
app.use(express.json({
    limit: '10mb'
})); // Increased limit

// Routes
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Server is OK!'
    });
});

function generateSessionId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const projectId = 'ecommercechatbot-9wvj';
const sessionID = generateSessionId(10);
const languageCode = 'en-US';
const keyFilename = 'C:/Users/ADMIN/Downloads/ecommercechatbot-9wvj-0050080132cc.json';

app.use('/api/v1/user', userRoutes);
app.use('/api/v1', loginRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/order', orderRoutes);
app.use('/api/v1/promotion', promotionRoutes);
app.use('/api/v1/image', imageRoutes);
app.use('/api/v1/analys', analysisSalesRoute);

const sessionClient = new SessionsClient({ keyFilename });

app.post('/api/v1/dialogflow', async (req, res) => {
    const { message } = req.body;
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionID);

    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: message,
                languageCode,
            },
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;
        res.json({ reply: result.fulfillmentText });
    } catch (error) {
        console.error('ERROR:', error);
        res.status(500).send('Something went wrong with Dialogflow');
    }
});

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
    res.status(status).json({
        error: {
            message
        }
    });
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
