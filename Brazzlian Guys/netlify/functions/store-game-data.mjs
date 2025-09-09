// netlify/functions/store-game-data.mjs
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const json = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', ...cors },
  body: JSON.stringify(body),
});

function parseBody(event) {
  const ct = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(event.body || '{}');
    } catch {
      return {};
    }
  }
  return {};
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Ambiente sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const input = parseBody(event);
  
  const { user_name, character, virtue, score, game_duration, enemies_defeated, actions } = input;

  if (!user_name || !character || !virtue || typeof score !== 'number' || typeof game_duration !== 'number' || !Array.isArray(actions)) {
    console.warn('[store-game-data] Parâmetros inválidos:', input);
    return json(400, { error: 'Parâmetros inválidos. Verifique o payload enviado.' });
  }

  const row = {
    user_name,
    character,
    virtue,
    score,
    game_duration,
    enemies_defeated,
    actions,
  };

  console.log('[store-game-data] Inserindo dados de jogo:', row);

  const { data, error } = await supabase
    .from('armazenamento_de_jogo')
    .insert([row])
    .select('*')
    .single();

  if (error) {
    console.error('[store-game-data] Erro de inserção:', error);
    return json(500, { error: error.message });
  }

  console.log('[store-game-data] Linha inserida com sucesso:', data);
  return json(200, { ok: true, data });
}