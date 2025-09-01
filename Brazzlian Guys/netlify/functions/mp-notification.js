// Arquivo: netlify/functions/mp-notification.js
const axios = require('axios'); // Lembre-se de instalar o axios: npm install axios

exports.handler = async (event) => {
    // 1. Verifique se o método HTTP é POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 2. Acesse o body da requisição de notificação
        const notificationData = JSON.parse(event.body);

        // O Mercado Pago envia um objeto com a "action" (evento) e o "data.id"
        // Este ID é o ID do pagamento que mudou de status
        const paymentId = notificationData.data.id;

        // 3. Pegue seu token de um ambiente seguro
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

        // 4. Use o ID para buscar os detalhes completos do pagamento na API do Mercado Pago
        const paymentUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;

        const response = await axios.get(paymentUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const paymentDetails = response.data;

        // 5. Verifique o status do pagamento para processar a lógica do seu jogo
        const paymentStatus = paymentDetails.status;
        const externalReference = paymentDetails.external_reference;

        console.log(`Notificação recebida para o pagamento ${paymentId} (Ref: ${externalReference})`);
        console.log(`Status atual: ${paymentStatus}`);

        if (paymentStatus === 'approved') {
            // Lógica para quando o pagamento é aprovado
            console.log(`Pagamento Aprovado! Liberando item para o pedido: ${externalReference}`);
            // Exemplo: Atualize seu banco de dados, adicione moedas ao jogador, envie um e-mail, etc.
        } else if (paymentStatus === 'rejected') {
            // Lógica para quando o pagamento é rejeitado
            console.log(`Pagamento Rejeitado. Pedido: ${externalReference}`);
        } else if (paymentStatus === 'pending') {
            // Lógica para quando o pagamento está pendente
            console.log(`Pagamento Pendente. Pedido: ${externalReference}`);
        }

        // 6. Retorne um status 200 (OK) para o Mercado Pago
        // Isso é crucial para que o Mercado Pago saiba que a notificação foi recebida com sucesso.
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Notification received successfully' })
        };

    } catch (error) {
        console.error('Erro ao processar notificação:', error.response ? error.response.data : error.message);
        // Retorne um erro 500 para que o Mercado Pago tente enviar a notificação novamente
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal Server Error',
                details: error.response ? error.response.data : error.message
            })
        };
    }
};