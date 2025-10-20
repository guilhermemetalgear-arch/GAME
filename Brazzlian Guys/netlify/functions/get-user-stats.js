// Arquivo: netlify/functions/get-user-stats.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Firebase-AppCheck', // Include AppCheck
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
    }

    try {
        const { login } = JSON.parse(event.body);

        if (!login) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Login é obrigatório' }) };
        }

        // --- INÍCIO DA MODIFICAÇÃO ---
        // Busca o usuário na tabela 'usuarios' e pega a coluna 'pontos_virtude'
        const { data, error } = await supabase
            .from('usuarios')
            .select('pontos_virtude')
            .eq('login', login)
            .maybeSingle(); // Retorna um único objeto ou null, não um array

        if (error) {
            console.error('Erro ao buscar usuário no Supabase:', error);
            throw error;
        }

        // Se o usuário não for encontrado (data é null) ou não tiver pontos, retorna 0
        const totalScore = data ? (data.pontos_virtude || 0) : 0;
        // --- FIM DA MODIFICAÇÃO ---


        return { statusCode: 200, headers, body: JSON.stringify({ success: true, totalScore: totalScore }) };

    } catch (err) {
        console.error('Erro interno na função get-user-stats:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Erro interno no servidor' }) };
    }
};