// Arquivo: netlify/functions/create-pix-payment.js
const axios = require('axios');
const { randomUUID } = require('crypto'); // Módulo nativo do Node.js para gerar IDs únicos

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed', headers };
    }

    try {
        const requestBody = JSON.parse(event.body);
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        
        // CORREÇÃO: Gera uma chave de idempotência única para cada requisição
        const idempotencyKey = randomUUID();

        const response = await axios.post(
            'https://api.mercadopago.com/v1/payments',
            {
                transaction_amount: requestBody.transaction_amount,
                description: requestBody.description,
                payment_method_id: 'pix',
                payer: requestBody.payer,
                external_reference: requestBody.external_reference
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    // CORREÇÃO: Adiciona a chave de idempotência no cabeçalho da requisição
                    'X-Idempotency-Key': idempotencyKey
                }
            }
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response.data)
        };

    } catch (error) {
        console.error('Erro na chamada da API:', error.response ? error.response.data : error.message);
        return {
            statusCode: error.response ? error.response.status : 500,
            headers,
            body: JSON.stringify({
                error: 'Ocorreu um erro ao processar o pagamento',
                details: error.response ? error.response.data : error.message
            })
        };
    }
};