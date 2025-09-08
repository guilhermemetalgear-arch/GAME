// Arquivo: netlify/functions/mp-notification.js
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // Bloco 1: Verificação da Assinatura (NENHUMA ALTERAÇÃO NESTA PARTE)
    try {
        const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
        const signatureHeader = event.headers['x-signature'];
        const requestId = event.headers['x-request-id'];

        if (!secret || !signatureHeader || !requestId) {
            console.error('Webhook secret, assinatura ou request-id não encontrados nos cabeçalhos.');
            return { statusCode: 400, body: 'Configuração de segurança incompleta.' };
        }

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

        const notificationData = JSON.parse(event.body);
        const notificationId = notificationData.data.id;
        
        const manifest = `id:${notificationId};request-id:${requestId};ts:${ts};`;

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(manifest);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== v1) {
            console.warn('Tentativa de notificação com assinatura inválida!');
            return { statusCode: 401, body: 'Assinatura inválida.' };
        }
    } catch (e) {
        console.error('Erro durante a verificação da assinatura:', e.message);
        return { statusCode: 500, body: 'Erro interno na verificação.' };
    }

    // Bloco 2: Processamento da Notificação (ALTERAÇÕES APLICADAS AQUI)
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

        console.log(`Notificação VÁLIDA recebida para o pagamento ${paymentId}. Status: ${paymentStatus}`);

        if (paymentStatus === 'approved') {
            console.log(`Pagamento Aprovado! Processando cadastro a partir de: ${externalReference}`);
            
            const refData = JSON.parse(externalReference);
            const { newUser, newPass } = refData;

            if (newUser && newPass) {
                const supabase = createClient(
                    process.env.SUPABASE_URL, 
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                
                const { data, error } = await supabase
                    .from('usuarios')
                    .insert([
                        { login: newUser, senha: newPass }
                    ]);

                if (error) {
                    console.error('Erro ao cadastrar usuário no Supabase:', error.message);
                } else {
                    console.log(`Usuário '${newUser}' cadastrado com sucesso no Supabase!`);
                }
            } else {
                 console.warn('Referência externa não continha dados de novo usuário.');
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Notificação processada com sucesso.' })
        };

    } catch (error) {
        // --- AJUSTE PRINCIPAL APLICADO AQUI ---
        // Verifica se o erro é o específico de "Pagamento não encontrado" (status 404).
        if (error.response && error.response.status === 404) {
            
            // Registra um AVISO em vez de um ERRO, pois é um cenário esperado.
            console.warn(`AVISO: A notificação se refere a um pagamento que não foi encontrado (ID: ${JSON.parse(event.body).data.id}). A notificação será ignorada.`);
            
            // Responde com sucesso (200) para que o Mercado Pago não reenvie a notificação.
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Notificação recebida, mas o pagamento não foi encontrado. Nenhum reenvio é necessário.' })
            };
        } else {
            // Para todos os outros erros (500, 401, etc.), mantém o comportamento de erro crítico.
            console.error('Erro ao processar notificação:', error.response ? error.response.data : error.message);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Erro interno no processamento' })
            };
        }
    }
};