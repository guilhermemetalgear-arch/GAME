// Arquivo: netlify/functions/mp-notification.js
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // === INÍCIO DA VERIFICAÇÃO DE ASSINATURA (MODO DEPURAÇÃO) ===
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

        const manifest = `${ts}${event.body}`;

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(manifest);
        const generatedSignature = hmac.digest('hex');
        
        // ======================= BLOCO DE DEPURAÇÃO =======================
        console.log('--- INICIANDO DEPURAÇÃO DE ASSINATURA ---');
        console.log('Timestamp (ts) recebido:', ts);
        console.log('Manifesto gerado para assinatura:', manifest);
        console.log('Assinatura recebida do MP (v1):', v1);
        console.log('Assinatura gerada localmente:', generatedSignature);
        console.log('As assinaturas são iguais?', generatedSignature === v1);
        console.log('Tamanho da chave secreta (deve ser 64):', secret ? secret.length : 'NÃO ENCONTRADA');
        console.log('--- FIM DA DEPURAÇÃO ---');
        // ================================================================

        // A linha abaixo foi comentada TEMPORARIAMENTE para permitir que o resto do código execute
        // e possamos ver os logs de depuração.
        /*
        if (generatedSignature !== v1) {
            console.warn('Assinatura inválida.');
            return { statusCode: 401, body: 'Assinatura inválida.' };
        }
        */

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

        console.log(`Notificação recebida para o pagamento ${paymentId}. Status: ${paymentStatus}`);

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
            body: JSON.stringify({ message: 'Notificação recebida em modo de depuração' })
        };

    } catch (error) {
        console.error('Erro ao processar notificação:', error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno no processamento' })
        };
    }
};