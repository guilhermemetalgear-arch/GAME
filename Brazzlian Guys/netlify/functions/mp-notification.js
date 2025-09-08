// Arquivo: netlify/functions/criar-pix.js (ou nome similar)
const axios = require('axios');

exports.handler = async (event) => {
    // Garante que o método da requisição seja POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido' };
    }

    try {
        // 1. Extrai os dados do corpo da requisição (enviados pelo seu frontend)
        const { amount, userEmail, userFirstName, userLastName, userDocument } = JSON.parse(event.body);

        if (!amount || !userEmail || !userFirstName || !userLastName || !userDocument) {
            return { statusCode: 400, body: 'Dados incompletos para gerar o PIX.' };
        }
        
        // --- AJUSTE PRINCIPAL APLICADO AQUI ---
        // Remove todos os caracteres não numéricos (pontos, traços, barras) do documento.
        // Ex: "123.456.789-00" se torna "12345678900"
        const documentoLimpo = userDocument.replace(/\D/g, '');

        // 2. Monta o corpo da requisição para a API de pagamentos
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        const paymentApiUrl = 'https://api.mercadopago.com/v1/payments';

        const dadosPagamento = {
            transaction_amount: Number(amount),
            description: 'Descrição do seu produto/serviço',
            payment_method_id: 'pix',
            payer: {
                email: userEmail,
                first_name: userFirstName,
                last_name: userLastName,
                identification: {
                    type: documentoLimpo.length === 11 ? 'CPF' : 'CNPJ',
                    number: documentoLimpo // Usa o documento já limpo
                }
            }
        };

        // 3. Envia a requisição para a API para criar o pagamento PIX
        const response = await axios.post(paymentApiUrl, dadosPagamento, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // 4. Retorna os dados do PIX (QR Code, etc.) para o frontend
        const dadosPix = {
            paymentId: response.data.id,
            qrCodeBase64: response.data.point_of_interaction.transaction_data.qr_code_base64,
            qrCode: response.data.point_of_interaction.transaction_data.qr_code
        };

        return {
            statusCode: 201, // 201 Created
            body: JSON.stringify(dadosPix)
        };

    } catch (error) {
        // Captura e loga o erro detalhado da API de pagamentos
        console.error('Falha ao criar PIX:', error.response ? error.response.data : error.message);
        
        const errorBody = error.response ? error.response.data : { message: 'Erro interno no servidor.' };

        return {
            // Retorna o mesmo status de erro da API externa (ex: 400) ou 500 se for um erro genérico.
            statusCode: error.response ? error.response.status : 500,
            body: JSON.stringify(errorBody)
        };
    }
};