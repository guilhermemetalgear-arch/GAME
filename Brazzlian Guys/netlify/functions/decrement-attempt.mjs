// netlify/functions/decrement-attempt.mjs
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', ...cors },
  body: JSON.stringify(body),
});

function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return {};
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Ambiente Supabase não configurado.' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { login } = parseBody(event);
  if (!login) {
    return json(400, { success: false, message: 'Login não fornecido.' });
  }

  // 1. Verifica as tentativas atuais do usuário
  const { data: user, error: fetchError } = await supabase
    .from('usuarios')
    .select('tentativas')
    .eq('login', login)
    .single();

  if (fetchError || !user) {
    return json(404, { success: false, message: 'Usuário não encontrado.' });
  }

  if (user.tentativas <= 0) {
    return json(403, { success: false, message: 'Você não possui tentativas restantes.' });
  }

  // 2. Chama a função do banco de dados para decrementar a tentativa
  const { error: rpcError } = await supabase.rpc('decrement_user_attempt', {
    user_login: login,
  });

  if (rpcError) {
    console.error('[decrement-attempt] RPC error:', rpcError);
    return json(500, { success: false, message: 'Erro ao registrar tentativa no banco de dados.' });
  }

  return json(200, { success: true, message: 'Tentativa registrada com sucesso.' });
}