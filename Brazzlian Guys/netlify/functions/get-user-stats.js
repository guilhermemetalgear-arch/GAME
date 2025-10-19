// Arquivo: netlify/functions/get-user-stats.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const { login } = JSON.parse(event.body);

        if (!login) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Login é obrigatório' }) };
        }

        // Busca no Supabase (tabela 'top_scores') e soma todos os 'points' do usuário
        // ATENÇÃO: Verifique se o nome da sua tabela de pontuação é 'top_scores'
        // e as colunas são 'points' e 'user_name'.
        const { data, error } = await supabase
            .from('top_scores')
            .select('points')
            .eq('user_name', login);

        if (error) {
            console.error('Erro ao buscar scores do usuário:', error);
            throw error;
        }

        // Soma todos os pontos encontrados
        const totalScore = data.reduce((acc, currentRow) => acc + (currentRow.points || 0), 0);

        return { statusCode: 200, headers, body: JSON.stringify({ success: true, totalScore: totalScore }) };

    } catch (err) {
        console.error('Erro interno na função get-user-stats:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno no servidor' }) };
    }
};