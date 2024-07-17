import crypto from 'crypto';
import https from 'https';

const MomoPayment = async (req, res, next) => {
    try {
        var partnerCode = "MOMO";
        var accessKey = "F8BBA842ECF85";
        var secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
        var requestId = partnerCode + new Date().getTime();
        var orderId = requestId;
        var orderInfo = "pay with MoMo";
        var redirectUrl = "https://momo.vn/return";
        var ipnUrl = "https://callback.url/notify";
        var amount = "50000";
        var requestType = "captureWallet"
        var extraData = ""; //pass empty value if your merchant does not have stores

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

            paymentResponse.on('end', () => {
                const responseBody = JSON.parse(data);
                res.json(responseBody);
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
