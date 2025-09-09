// netlify/functions/submit-gamedata.mjs (ESM)
import { createClient } from '@supabase/supabase-js';

// Re-using CORS and JSON helper from other functions
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

// A simple body parser, assuming JSON for this function
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
    return json(500, { error: 'Ambiente sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const input = parseBody(event);

  const { userName, score, characterInfo, virtueInfo, gameplayLog } = input;

  if (!userName || typeof score !== 'number' || !characterInfo || !virtueInfo || !Array.isArray(gameplayLog)) {
    console.warn('[submit-gamedata] params invalid', {
        userName: typeof userName,
        score: typeof score,
        characterInfo: typeof characterInfo,
        virtueInfo: typeof virtueInfo,
        gameplayLog: Array.isArray(gameplayLog)
    });
    return json(400, { error: 'Parâmetros inválidos.' });
  }

  // Supabase table: armazenamento_de_jogo
  // Columns: user_name, score, character_info, virtue_info, gameplay_log
  const row = {
    user_name: userName,
    score: score,
    character_info: characterInfo, // Assuming JSON/JSONB column
    virtue_info: virtueInfo,       // Assuming JSON/JSONB column
    gameplay_log: gameplayLog      // Assuming JSON/JSONB column
  };

  console.log('[submit-gamedata] inserting gamedata for user:', userName);

  const { data, error } = await supabase
    .from('armazenamento_de_jogo') // CORREÇÃO: Nome da tabela ajustado para não ter espaços.
    .insert([row])
    .select('*')
    .single();

  if (error) {
    console.error('[submit-gamedata] insert error', error);
    return json(500, { error: error.message });
  }

  console.log('[submit-gamedata] inserted row', data);
  return json(200, { ok: true, data });
}