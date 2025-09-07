// Arquivo: netlify/functions/mp-notification.js
const axios = require('axios');
const crypto = require('crypto'); // Módulo nativo do Node.js para criptografia

exports.handler = async (event) => {
    // === INÍCIO DA VERIFICAÇÃO DE ASSINATURA ===
    try {
        // 1. Pega a assinatura secreta das variáveis de ambiente
        const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

        // 2. Pega o cabeçalho da assinatura enviado pelo Mercado Pago
        const signatureHeader = event.headers['x-signature'];

        if (!secret || !signatureHeader) {
            console.error('Webhook secret ou assinatura do header não encontrados.');
            return { statusCode: 400, body: 'Configuração de segurança incompleta.' };
        }

        // 3. Extrai o timestamp (ts) e o hash (v1) do cabeçalho
        const parts = signatureHeader.split(',').reduce((acc, part) => {
            const [key, value] = part.split('=');
            acc[key.trim()] = value.trim();
            return acc;
        }, {});

        const ts = parts.ts;
        const v1 = parts.v1;

        if (!ts || !v1) {
             return { statusCode: 400, body: 'Formato da assinatura inválido.' };
        }

        // 4. Cria o "manifest" que o Mercado Pago usou para gerar a assinatura
        // O formato exato pode ser encontrado na documentação do MP, mas geralmente envolve o timestamp e o corpo da requisição.
        const manifest = `ts:${ts},body:${event.body}`;

        // 5. Gera uma assinatura local usando sua chave secreta
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(manifest);
        const generatedSignature = hmac.digest('hex');

        // 6. Compara a assinatura gerada com a que foi enviada pelo Mercado Pago
        if (generatedSignature !== v1) {
            console.warn('Tentativa de notificação com assinatura inválida!');
            return { statusCode: 401, body: 'Assinatura inválida.' };
        }
    } catch (e) {
        console.error('Erro durante a verificação da assinatura:', e.message);
        return { statusCode: 500, body: 'Erro interno na verificação.' };
    }
    // === FIM DA VERIFICAÇÃO DE ASSINATURA ===

    // Se a assinatura for válida, o código continua a partir daqui...
    try {
        const notificationData = JSON.parse(event.body);
        const paymentId = notificationData.data.id;
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        const paymentUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;

        const response = await axios.get(paymentUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const paymentDetails = response.data;
        const paymentStatus = paymentDetails.status;
        const externalReference = paymentDetails.external_reference;

        console.log(`Notificação VÁLIDA recebida para o pagamento ${paymentId} (Ref: ${externalReference})`);
        console.log(`Status atual: ${paymentStatus}`);

        if (paymentStatus === 'approved') {
            console.log(`Pagamento Aprovado! Liberando item para o pedido: ${externalReference}`);
            // AQUI entra sua lógica para liberar o item no jogo (ex: atualizar o banco de dados)
        } else {
            console.log(`Pagamento com status: ${paymentStatus}. Pedido: ${externalReference}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Notificação recebida e validada com sucesso' })
        };

    } catch (error) {
        console.error('Erro ao processar notificação:', error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno no processamento' })
        };
    }
};