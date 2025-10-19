// Arquivo: netlify/functions/register-google-user.js
const { createClient } = require('@supabase/supabase-js');

// Conecta-se ao Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Firebase-AppCheck',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
    }

    try {
        const { login, email } = JSON.parse(event.body);

        if (!login || !email) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Login e email são obrigatórios' }) };
        }

        // --- INÍCIO DA MODIFICAÇÃO DESTA RODADA ---
        // Adicionado um valor padrão para 'senha' para evitar o erro NOT-NULL.
        // Se o email já existir, o 'login' será atualizado e a 'senha' também
        // será sobrescrita com este placeholder.
        const userData = {
            login: login,
            email: email,
            senha: 'google_user' // Valor padrão para satisfazer a restrição
        };
        // --- FIM DA MODIFICAÇÃO ---

        const { data, error } = await supabase
            .from('usuarios')
            .upsert(
                userData, // Usa o novo objeto com a senha
                { 
                  onConflict: 'email', // A coluna que deve ser checada para conflito
                  ignoreDuplicates: false // Garante que o 'login' seja atualizado se o email existir
                }
            )
            .select();

        if (error) {
            console.error('Erro no upsert do Supabase:', error);
            // Log do erro original para depuração
            console.error('Detalhes do Erro Supabase:', {
                code: error.code,
                details: error.details,
                message: error.message
            });
            throw error;
        }

        console.log('Usuário do Google registrado/atualizado no Supabase:', data);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data }) };

    } catch (err) {
        console.error('Erro interno na função register-google-user:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Erro interno no servidor' }) };
    }
};