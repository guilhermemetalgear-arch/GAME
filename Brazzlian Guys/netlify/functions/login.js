// Arquivo: netlify/functions/login.js
const { createClient } = require('@supabase/supabase-js');

// Conecta-se ao Supabase usando as variáveis de ambiente que você deve configurar no Netlify
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Usamos a Service Role Key para ter acesso total no servidor
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
        const { login, senha } = JSON.parse(event.body);

        if (!login || !senha) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Login e senha são obrigatórios' }) };
        }

        // Busca no Supabase pelo usuário com o login informado
        const { data, error } = await supabase
            .from('usuarios')
            .select('senha') // Pega apenas a coluna da senha
            .eq('login', login) // Onde a coluna 'login' é igual ao login recebido
            .single(); // Espera apenas um resultado

        if (error || !data) {
            console.log('Usuário não encontrado ou erro:', error);
            return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: 'Login ou senha inválidos.' }) };
        }

        // **AVISO**: Comparação de senha em texto puro. Inseguro para produção!
        // Em um projeto real, você usaria uma biblioteca como bcrypt para comparar hashes.
        if (data.senha === senha) {
            // Se a senha bate, retorna sucesso
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        } else {
            // Se a senha não bate, retorna falha
            return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: 'Login ou senha inválidos.' }) };
        }

    } catch (err) {
        console.error('Erro interno na função de login:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno no servidor' }) };
    }
};