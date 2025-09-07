// Arquivo: netlify/functions/check-payment-status.js
const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const { paymentId } = JSON.parse(event.body);
        if (!paymentId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID do pagamento é obrigatório.' }) };
        }

        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        const paymentUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;

        const response = await axios.get(paymentUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const paymentStatus = response.data.status;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: paymentStatus })
        };

    } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error.response ? error.response.data : error.message);
        return {
            statusCode: error.response ? error.response.status : 500,
            headers,
            body: JSON.stringify({ error: 'Erro ao consultar o pagamento.' })
        };
    }
};