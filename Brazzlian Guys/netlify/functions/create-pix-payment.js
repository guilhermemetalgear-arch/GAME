// Arquivo: netlify/functions/create-pix-payment.js
const axios = require('axios');

exports.handler = async (event) => {
    // Cabeçalhos de permissão (CORS)
    const headers = {
        'Access-Control-Allow-Origin': '*', // Permite acesso de qualquer origem
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // O navegador envia uma requisição 'OPTIONS' antes do 'POST' para verificar as permissões.
    // Devemos respondê-la imediatamente com os cabeçalhos.
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
                    'Content-Type': 'application/json'
                }
            }
        );

        // Retorna a resposta da API com os cabeçalhos CORS
        return {
            statusCode: 200,
            headers, // <-- ADICIONADO AQUI
            body: JSON.stringify(response.data)
        };

    } catch (error) {
        console.error('Erro na chamada da API:', error.response ? error.response.data : error.message);
        return {
            statusCode: error.response ? error.response.status : 500,
            headers, // <-- E AQUI TAMBÉM
            body: JSON.stringify({
                error: 'Ocorreu um erro ao processar o pagamento',
                details: error.response ? error.response.data : error.message
            })
        };
    }
};