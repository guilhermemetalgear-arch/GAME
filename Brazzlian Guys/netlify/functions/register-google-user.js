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
        // Adicionado pontos_virtude: 0 para garantir que novos usuários comecem com 0
        const userData = {
            login: login,
            email: email,
            senha: 'google_user', // Placeholder for NOT NULL constraint
            pontos_virtude: 0     // Default value for new users
        };
        // --- FIM DA MODIFICAÇÃO ---

        const { data, error } = await supabase
            .from('usuarios')
            .upsert(
                userData,
                {
                  onConflict: 'email', // Check conflict on email
                  // IMPORTANT: Supabase upsert by default only inserts if the row doesn't exist based on PK/constraint.
                  // To *update* existing rows based on the onConflict column, you need V11+ of supabase-js and specific syntax,
                  // OR handle it as select -> insert/update.
                  // HOWEVER, the default behavior *might* be what you want if 'email' is NOT your primary key but has a UNIQUE constraint.
                  // If 'email' has a UNIQUE constraint, this *will* update the 'login' and 'senha' (and 'pontos_virtude' if specified here).
                  // Assuming 'email' has a UNIQUE constraint:
                  ignoreDuplicates: false // Ensures existing rows matching 'email' are updated
                }
            )
            .select();

        if (error) {
            console.error('Erro no upsert do Supabase:', error);
            console.error('Detalhes do Erro Supabase:', { code: error.code, details: error.details, message: error.message });
            throw error;
        }

        console.log('Usuário do Google registrado/atualizado no Supabase:', data);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data }) };

    } catch (err) {
        console.error('Erro interno na função register-google-user:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Erro interno no servidor' }) };
    }
};