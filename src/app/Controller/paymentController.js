import crypto from 'crypto';
import https from 'https';

import Order from '../Model/order.Model.js';

const MomoPayment = async (req, res, next) => {
    try {
        const { amount, orderId } = req.body;
        if (!amount || !orderId) {
            return res.status(400).json({ error: 'Thông tin đơn hàng không đầy đủ' });
        }


        var partnerCode = "MOMO";
        var accessKey = "F8BBA842ECF85";
        var secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
        var requestId = partnerCode + new Date().getTime();
        var orderInfo = "pay with MoMo";
        var redirectUrl = "https://momo.vn/return";
        var ipnUrl = "https://callback.url/notify";
        var requestType = "payWithATM"
        var extraData = "";

        // Create the raw signature string
        var rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        
        // Create the signature
        var signature = crypto.createHmac('sha256', secretkey)
            .update(rawSignature)
            .digest('hex');

        // JSON object to send to MoMo endpoint
        const requestBody = JSON.stringify({
            partnerCode: partnerCode,
            accessKey: accessKey,
            requestId: requestId,
            amount: amount,
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: redirectUrl,
            ipnUrl: ipnUrl,
            extraData: extraData,
            requestType: requestType,
            signature: signature,
            lang: 'en'
        });

        // Options for the HTTPS request
        const options = {
            hostname: 'test-payment.momo.vn',
            port: 443,
            path: '/v2/gateway/api/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        // Send the request and get the response
        const paymentRequest = https.request(options, (paymentResponse) => {
            let data = '';

            paymentResponse.on('data', (chunk) => {
                data += chunk;
            });

            paymentResponse.on('end', async () => {
                const responseBody = JSON.parse(data);
                if (responseBody.resultCode === 0) {
                    // Update the order status in the database
                    try {
                        await Order.findByIdAndUpdate(orderId, { paymentStatus: 'Paid' });
                        res.json(responseBody);
                    } catch (dbError) {
                        console.error(`Database update error: ${dbError.message}`);
                        res.status(500).json({ error: 'Cập nhật đơn hàng không thành công' });
                    }
                } else {
                    console.log('a')
                    res.status(400).json({ error: 'Thanh toán không thành công', details: responseBody });
                }
            });
        });

        paymentRequest.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
            res.status(500).json({ error: e.message });
        });

        // Write data to request body
        paymentRequest.write(requestBody);
        paymentRequest.end();
    } catch (error) {
        next(error);
    }
}

export default {
    MomoPayment
};
