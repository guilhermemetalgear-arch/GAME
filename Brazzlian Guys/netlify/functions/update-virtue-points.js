// Arquivo: netlify/functions/update-virtue-points.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*', // Adjust for production if needed
        'Access-Control-Allow-Headers': 'Content-Type, X-Firebase-AppCheck', // Include AppCheck header
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
    }

    try {
        const { login, totalPoints } = JSON.parse(event.body);

        if (!login || typeof totalPoints !== 'number') {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Login e totalPoints (numérico) são obrigatórios' }) };
        }

        // Garante que os pontos sejam inteiros
        const pointsToUpdate = Math.round(totalPoints);

        const { data, error } = await supabase
            .from('usuarios')
            .update({ pontos_virtude: pointsToUpdate })
            .eq('login', login) // Assume 'login' é a coluna para encontrar o usuário
            .select(); // Opcional: retorna os dados atualizados

        if (error) {
            console.error('Erro ao atualizar pontos_virtude no Supabase:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn(`Nenhum usuário encontrado com login '${login}' para atualizar pontos.`);
            // Decide if this should be an error or just a warning
            // return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Usuário não encontrado' }) };
        } else {
            console.log(`Pontos de virtude atualizados para ${login}:`, data);
        }

        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data }) };

    } catch (err) {
        console.error('Erro interno na função update-virtue-points:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Erro interno no servidor' }) };
    }
};