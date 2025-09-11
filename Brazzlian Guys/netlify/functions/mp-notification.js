// Arquivo: netlify/functions/mp-notification.js
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Inicializa o cliente Supabase com as variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const notification = JSON.parse(event.body);

        // 1. Verifica se a notificação é de um pagamento e possui um ID
        if (notification.type === 'payment' && notification.data && notification.data.id) {
            const paymentId = notification.data.id;
            const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
            const paymentUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;

            // 2. Busca os detalhes do pagamento na API do Mercado Pago
            const paymentResponse = await axios.get(paymentUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const paymentDetails = paymentResponse.data;

            // 3. Procede apenas se o pagamento estiver aprovado e tiver os dados do novo usuário
            if (paymentDetails.status === 'approved' && paymentDetails.external_reference) {
                const { newUser, newPass } = JSON.parse(paymentDetails.external_reference);
                const transactionAmount = Math.floor(paymentDetails.transaction_amount);

                if (!newUser || !newPass || transactionAmount < 1) {
                    console.warn('Dados insuficientes na referência externa ou valor inválido.', paymentDetails.external_reference);
                    // Retorna 200 para que o Mercado Pago não tente reenviar uma notificação com dados inválidos
                    return { statusCode: 200, body: 'Dados inválidos na notificação.' };
                }

                // 4. Verifica se o usuário já existe para evitar duplicatas
                const { data: existingUser, error: findError } = await supabase
                    .from('usuarios')
                    .select('login')
                    .eq('login', newUser)
                    .single();

                // 'PGRST116' é o código para "nenhuma linha encontrada", o que é o esperado. Qualquer outro erro é um problema.
                if (findError && findError.code !== 'PGRST116') {
                    throw findError;
                }

                if (existingUser) {
                    console.log(`Usuário ${newUser} já existe. Ignorando criação.`);
                    return { statusCode: 200, body: 'Usuário já cadastrado.' };
                }

                // 5. Insere o novo usuário no Supabase com as tentativas baseadas no valor pago
                const { error: insertError } = await supabase
                    .from('usuarios')
                    .insert([
                        {
                            login: newUser,
                            senha: newPass, // ATENÇÃO: Armazenar senhas em texto puro não é seguro. Em produção, use um método de hash (ex: bcrypt).
                            tentativas: transactionAmount
                        }
                    ]);

                if (insertError) {
                    // Lança o erro para ser capturado pelo bloco catch
                    throw insertError;
                }

                console.log(`Usuário ${newUser} criado com sucesso com ${transactionAmount} tentativas.`);
            }
        }

        // 6. Retorna status 200 para confirmar o recebimento da notificação ao Mercado Pago
        return { statusCode: 200, body: 'Notificação recebida com sucesso.' };

    } catch (error) {
        console.error('Erro no webhook do Mercado Pago:', error);
        // Retorna um erro 500, o que fará o Mercado Pago tentar reenviar a notificação mais tarde.
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno ao processar a notificação.' })
        };
    }
};