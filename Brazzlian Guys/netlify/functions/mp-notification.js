// Arquivo: netlify/functions/mp-notification.js
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Inicializa o cliente Supabase com as variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const notification = JSON.parse(event.body);

        if (notification.type === 'payment' && notification.data && notification.data.id) {
            const paymentId = notification.data.id;
            const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
            const paymentUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;

            const paymentResponse = await axios.get(paymentUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const paymentDetails = paymentResponse.data;

            if (paymentDetails.status === 'approved' && paymentDetails.external_reference) {
                const {
                    newUser, newPass, cupom, fullName, cpf, email, address, city, state
                } = JSON.parse(paymentDetails.external_reference);

                const transactionAmount = Math.floor(paymentDetails.transaction_amount);
                const paymentDate = paymentDetails.date_approved || new Date().toISOString();

                if (!newUser || !newPass || transactionAmount < 1) {
                    console.warn('Dados essenciais (newUser, newPass) faltando na referência externa.', paymentDetails.external_reference);
                    return { statusCode: 200, body: 'Dados inválidos na notificação.' };
                }

                const { data: existingUser, error: findError } = await supabase
                    .from('usuarios')
                    .select('login')
                    .eq('login', newUser)
                    .single();

                if (findError && findError.code !== 'PGRST116') {
                    throw findError;
                }

                if (existingUser) {
                    console.log(`Usuário ${newUser} já existe. Ignorando criação.`);
                    return { statusCode: 200, body: 'Usuário já cadastrado.' };
                }

                const { error: insertUserError } = await supabase
                    .from('usuarios')
                    .insert([
                        {
                            login: newUser,
                            senha: newPass,
                            tentativas: transactionAmount,
                            nome_completo: fullName,
                            cpf: cpf ? cpf.replace(/\D/g, '') : null,
                            email: email,
                            endereco: address,
                            cidade: city,
                            estado_uf: state ? state.toUpperCase() : null
                        }
                    ]);

                if (insertUserError) {
                    // ALTERAÇÃO DEFINITIVA: Se ocorrer um conflito de inserção (23505),
                    // significa que outra chamada está criando o usuário.
                    // A melhor abordagem é parar esta execução e deixar a outra terminar.
                    if (insertUserError.code === '23505') {
                        console.warn(`Conflito de inserção para ${newUser} (23505). Outra notificação já está em processo. Esta execução será abortada.`);
                        // Retorna 200 OK para que o Mercado Pago não tente reenviar a notificação.
                        return { statusCode: 200, body: 'Notificação duplicada durante processamento.' };
                    } else {
                        // Se for outro erro, lança para ser capturado pelo catch geral.
                        throw insertUserError;
                    }
                }
                
                // Apenas a primeira notificação (a que teve sucesso na inserção) continuará a partir daqui.
                console.log(`Usuário ${newUser} criado com sucesso com todos os dados.`);

                const { error: insertCouponError } = await supabase
                    .from('cupons_aplicados')
                    .insert([
                        {
                            usuario: newUser,
                            cupom_aplicado: cupom || null,
                            data_do_pagamento: paymentDate,
                            valor_pagamento: paymentDetails.transaction_amount
                        }
                    ]);

                if (insertCouponError) {
                    // Apenas registra o erro, pois a criação do usuário é mais crítica
                    console.error('Erro ao inserir na tabela de cupons aplicados:', insertCouponError);
                } else {
                    console.log(`Registro de pagamento/cupom para ${newUser} inserido com sucesso.`);
                }
            }
        }

        return { statusCode: 200, body: 'Notificação recebida com sucesso.' };

    } catch (error) {
        console.error('Erro no webhook do Mercado Pago:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno ao processar a notificação.' })
        };
    }
};