// Arquivo: netlify/functions/mp-notification.js
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Inicializa o cliente Supabase com as variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
    console.log('[mp-notification] Início da execução.');

    if (event.httpMethod !== 'POST') {
        console.log('[mp-notification] Método não permitido:', event.httpMethod);
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        console.log('[mp-notification] Corpo da notificação recebida:', event.body);
        const notification = JSON.parse(event.body);

        if (notification.type === 'payment' && notification.data && notification.data.id) {
            const paymentId = notification.data.id;
            console.log(`[mp-notification] Notificação de pagamento recebida. ID do Pagamento: ${paymentId}`);

            const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
            const paymentUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;

            console.log(`[mp-notification] Buscando detalhes do pagamento na URL: ${paymentUrl}`);
            const paymentResponse = await axios.get(paymentUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const paymentDetails = paymentResponse.data;
            console.log('[mp-notification] Detalhes do pagamento recebidos:', JSON.stringify(paymentDetails, null, 2));


            if (paymentDetails.status === 'approved') {
                console.log('[mp-notification] Status do pagamento: APROVADO.');

                if (paymentDetails.external_reference) {
                    console.log('[mp-notification] Referência externa encontrada:', paymentDetails.external_reference);

                    let externalRefData;
                    try {
                        externalRefData = JSON.parse(paymentDetails.external_reference);
                        console.log('[mp-notification] Dados da referência externa (JSON parseado):', externalRefData);
                    } catch (e) {
                        console.error('[mp-notification] ERRO CRÍTICO: Falha ao fazer o parse da external_reference. Conteúdo:', paymentDetails.external_reference, e);
                        return { statusCode: 200, body: 'Erro ao processar external_reference.' };
                    }

                    // ATUALIZAÇÃO: Extrai 'age' dos dados
                    const { newUser, newPass, age } = externalRefData;
                    const transactionAmount = Math.floor(paymentDetails.transaction_amount);

                    if (!newUser || !newPass || transactionAmount < 1) {
                        console.warn('[mp-notification] AVISO: Dados essenciais (newUser, newPass) faltando na referência externa ou valor inválido.', externalRefData);
                        return { statusCode: 200, body: 'Dados inválidos na notificação.' };
                    }

                    console.log(`[mp-notification] Tentando criar usuário: ${newUser}`);
                    const { error: insertUserError } = await supabase
                        .from('usuarios')
                        .insert([{
                            login: newUser,
                            senha: newPass,
                            tentativas: transactionAmount,
                            nome_completo: externalRefData.fullName,
                            cpf: externalRefData.cpf ? externalRefData.cpf.replace(/\D/g, '') : null,
                            email: externalRefData.email,
                            idade: age, // ADICIONADO CAMPO IDADE
                            endereco: externalRefData.address,
                            cidade: externalRefData.city,
                            estado_uf: externalRefData.state ? externalRefData.state.toUpperCase() : null
                        }]);

                    if (insertUserError) {
                        console.error('[mp-notification] Erro ao inserir usuário no Supabase:', insertUserError);
                        if (insertUserError.code === '23505') {
                            console.warn(`[mp-notification] Conflito de inserção para ${newUser} (23505). Outra notificação pode estar em processo. Abortando esta execução.`);
                            return { statusCode: 200, body: 'Notificação duplicada durante processamento.' };
                        } else {
                            throw insertUserError;
                        }
                    }

                    console.log(`[mp-notification] SUCESSO: Usuário ${newUser} criado.`);
                    
                    const paymentDate = paymentDetails.date_approved || new Date().toISOString();
                    const { error: insertCouponError } = await supabase
                        .from('cupons_aplicados')
                        .insert([{
                            usuario: newUser,
                            cupom_aplicado: externalRefData.cupom || null,
                            data_do_pagamento: paymentDate,
                            valor_pagamento: paymentDetails.transaction_amount
                        }]);

                    if (insertCouponError) {
                        console.error(`[mp-notification] AVISO: Erro ao inserir na tabela de cupons para o usuário ${newUser}, mas o usuário foi criado. Erro:`, insertCouponError);
                    } else {
                        console.log(`[mp-notification] Registro de pagamento/cupom para ${newUser} inserido com sucesso.`);
                    }

                } else {
                    console.warn('[mp-notification] AVISO: Pagamento aprovado, mas sem external_reference. Nada a fazer.');
                }
            } else {
                console.log(`[mp-notification] Pagamento não está com status 'approved'. Status atual: ${paymentDetails.status}. Nada a fazer.`);
            }
        } else {
             console.log('[mp-notification] Notificação não é do tipo "payment" ou está malformada. Ignorando.');
        }

        console.log('[mp-notification] Fim da execução bem-sucedida.');
        return { statusCode: 200, body: 'Notificação recebida com sucesso.' };

    } catch (error) {
        console.error('[mp-notification] ERRO FATAL no webhook do Mercado Pago:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno ao processar a notificação.' })
        };
    }
};