// Arquivo: netlify/functions/create-pix-payment.js
const axios = require('axios');
const { randomUUID } = require('crypto'); // Módulo nativo do Node.js para gerar IDs únicos
// ADIÇÃO: Importa o cliente do Supabase para verificação de dados
const { createClient } = require('@supabase/supabase-js');

// ADIÇÃO: Inicializa o cliente Supabase com as variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed', headers };
    }

    try {
        const requestBody = JSON.parse(event.body);
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        
        // --- INÍCIO DA VERIFICAÇÃO DE DUPLICIDADE ---

        // 1. Valida e extrai dados do usuário da `external_reference`
        let externalRefData;
        try {
            // A external_reference é enviada como uma string JSON, então é necessário fazer o parse.
            externalRefData = JSON.parse(requestBody.external_reference);
        } catch (e) {
            console.error('Erro ao fazer parse da external_reference:', requestBody.external_reference);
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dados de referência externa inválidos ou malformatados.' }) };
        }

        // ATUALIZAÇÃO: Adiciona 'age' à desestruturação e validação
        const { newUser, fullName, email, cpf, age } = externalRefData;
        
        if (!newUser || !fullName || !email || !cpf || !age) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Login, nome completo, email, CPF e idade são obrigatórios para o cadastro.' }) };
        }
        
        const cleanedCpf = cpf.replace(/\D/g, ''); // Remove caracteres não numéricos do CPF

        // 2. Consulta o Supabase para verificar se algum dos campos já existe
        const { data: existingUsers, error: queryError } = await supabase
            .from('usuarios')
            .select('login, nome_completo, email, cpf')
            .or(`login.eq.${newUser},nome_completo.eq.${fullName},email.eq.${email},cpf.eq.${cleanedCpf}`);

        if (queryError) {
            console.error('[create-pix-payment] Erro ao consultar o Supabase para verificar duplicidade:', queryError);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Ocorreu um erro ao verificar os dados. Tente novamente.' }) };
        }

        // 3. Se encontrou algum usuário, constrói a mensagem de erro e interrompe o processo
        if (existingUsers && existingUsers.length > 0) {
            const conflictFields = new Set(); // Usamos Set para evitar mensagens duplicadas
            
            existingUsers.forEach(user => {
                if (user.login.toLowerCase() === newUser.toLowerCase()) {
                    conflictFields.add('Login');
                }
                if (user.nome_completo.toLowerCase() === fullName.toLowerCase()) {
                    conflictFields.add('Nome Completo');
                }
                if (user.email.toLowerCase() === email.toLowerCase()) {
                    conflictFields.add('Email');
                }
                if (user.cpf === cleanedCpf) {
                    conflictFields.add('CPF');
                }
            });

            if (conflictFields.size > 0) {
                const errorMessage = `Já existe um cadastro com o(s) seguinte(s) dado(s): ${Array.from(conflictFields).join(', ')}. Por favor, verifique as informações.`;
                
                return {
                    statusCode: 409, // HTTP 409 Conflict é o status ideal para este caso
                    headers,
                    body: JSON.stringify({ error: errorMessage })
                };
            }
        }

        // --- FIM DA VERIFICAÇÃO DE DUPLICIDADE ---
        // Se o código chegou até aqui, não há duplicatas e podemos prosseguir.

        const idempotencyKey = randomUUID();

        const response = await axios.post(
            'https://api.mercadopago.com/v1/payments',
            {
                transaction_amount: requestBody.transaction_amount,
                description: requestBody.description,
                payment_method_id: 'pix',
                payer: requestBody.payer,
                external_reference: requestBody.external_reference // A referência original é mantida
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey
                }
            }
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response.data)
        };

    } catch (error) {
        console.error('Erro na chamada da API ou no processamento:', error.response ? error.response.data : error.message);
        return {
            statusCode: error.response ? error.response.status : 500,
            headers,
            body: JSON.stringify({
                error: 'Ocorreu um erro ao processar o pagamento',
                details: error.response ? error.response.data : error.message
            })
        };
    }
};