// Arquivo: netlify/functions/mp-notification.js
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // === INÍCIO DA VERIFICAÇÃO DE ASSINATURA ===
    try {
        const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
        const signatureHeader = event.headers['x-signature'];

        if (!secret || !signatureHeader) {
            console.error('Webhook secret ou assinatura do header não encontrados.');
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

        const manifest = `ts:${ts},body:${event.body}`;
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
    // === FIM DA VERIFICAÇÃO DE ASSINATURA ===

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

        // SÓ EXECUTA A LÓGICA DE CADASTRO SE O PAGAMENTO FOR APROVADO
        if (paymentStatus === 'approved') {
            console.log(`Pagamento Aprovado! Processando cadastro a partir de: ${externalReference}`);
            
            // Extrai os dados de cadastro da referência externa
            const refData = JSON.parse(externalReference);
            const { newUser, newPass } = refData;

            if (newUser && newPass) {
                // Conecta ao Supabase para inserir o novo usuário
                const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
                
                const { data, error } = await supabase
                    .from('usuarios')
                    .insert([{ login: newUser, senha: newPass }]); // AVISO: Senha em texto puro!

                if (error) {
                    console.error('Erro ao cadastrar usuário no Supabase:', error.message);
                    // Mesmo com erro no Supabase, retorna 200 para o MP não reenviar a notificação
                } else {
                    console.log(`Usuário '${newUser}' cadastrado com sucesso no Supabase!`);
                }
            } else {
                 console.warn('Referência externa não continha dados de novo usuário.');
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Notificação recebida e validada' })
        };

    } catch (error) {
        console.error('Erro ao processar notificação:', error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno no processamento' })
        };
    }
};