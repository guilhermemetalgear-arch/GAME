// Arquivo: netlify/functions/create-pix-payment.js
const axios = require('axios'); // Você precisará instalar o axios: npm install axios

exports.handler = async (event) => {
    // 1. Verifique se o método HTTP é POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 2. Acesse o body da requisição (dados enviados pelo seu jogo)
        const requestBody = JSON.parse(event.body);

        // 3. Pegue seu token de um ambiente seguro (variável de ambiente do Netlify)
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

        // 4. Construa a requisição para a API do Mercado Pago
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

        // 5. Retorne a resposta da API para o seu jogo
        return {
            statusCode: 200,
            body: JSON.stringify(response.data)
        };

    } catch (error) {
        console.error('Erro na chamada da API:', error.response ? error.response.data : error.message);
        return {
            statusCode: error.response ? error.response.status : 500,
            body: JSON.stringify({
                error: 'Ocorreu um erro ao processar o pagamento',
                details: error.response ? error.response.data : error.message
            })
        };
    }
};